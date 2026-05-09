/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package content

import (
	"context"
	"sort"
	"time"

	"github.com/apache/answer/internal/base/constant"
	"github.com/apache/answer/internal/base/handler"
	"github.com/apache/answer/internal/base/reason"
	"github.com/apache/answer/internal/entity"
	"github.com/apache/answer/internal/repo/poll"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/internal/service/permission"
	questioncommon "github.com/apache/answer/internal/service/question_common"
	"github.com/apache/answer/internal/service/rank"
	"github.com/apache/answer/internal/service/role"
	"github.com/apache/answer/internal/service/unique"
	"github.com/apache/answer/pkg/uid"
	"github.com/segmentfault/pacman/errors"
	"xorm.io/xorm"
)

const (
	pollMinOptions = 2
	pollMaxOptions = 30
)

// PollService manages structured polls attached to questions (post_type = poll).
type PollService struct {
	pollRepo     poll.PollRepo
	questionRepo questioncommon.QuestionRepo
	rankService  *rank.RankService
	userRoleRel  *role.UserRoleRelService
	uniqueIDRepo unique.UniqueIDRepo
}

// NewPollService constructs PollService.
func NewPollService(
	pollRepo poll.PollRepo,
	questionRepo questioncommon.QuestionRepo,
	rankService *rank.RankService,
	userRoleRel *role.UserRoleRelService,
	uniqueIDRepo unique.UniqueIDRepo,
) *PollService {
	return &PollService{
		pollRepo:     pollRepo,
		questionRepo: questionRepo,
		rankService:  rankService,
		userRoleRel:  userRoleRel,
		uniqueIDRepo: uniqueIDRepo,
	}
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func (ps *PollService) isStaff(ctx context.Context, userID string) bool {
	if len(userID) == 0 {
		return false
	}
	rid, err := ps.userRoleRel.GetUserRole(ctx, userID)
	if err != nil {
		return false
	}
	return rid == role.RoleAdminID || rid == role.RoleModeratorID
}

func normalizeResultVisibility(v string) string {
	switch v {
	case entity.PollResultVisibilityAfterVote, entity.PollResultVisibilityAfterClose:
		return v
	default:
		return entity.PollResultVisibilityAlways
	}
}

// CreateForQuestion persists poll row and options after the question row exists.
func (ps *PollService) CreateForQuestion(ctx context.Context, questionID string, in *schema.PollCreateInput) error {
	if in == nil {
		return errors.BadRequest(reason.PollOptionsInvalid)
	}
	if len(in.Options) < pollMinOptions || len(in.Options) > pollMaxOptions {
		return errors.BadRequest(reason.PollOptionsInvalid)
	}
	maxCh := in.MaxChoicesPerUser
	if maxCh < 1 {
		maxCh = 1
	}
	if maxCh > len(in.Options) {
		return errors.BadRequest(reason.PollMaxChoicesExceeded)
	}
	now := time.Now()
	qid := uid.DeShortID(questionID)
	p := &entity.QuestionPoll{
		QuestionID:        qid,
		MaxChoicesPerUser: maxCh,
		AllowChangeVote:   boolToInt(in.AllowChangeVote),
		ResultVisibility:  normalizeResultVisibility(in.ResultVisibility),
		Status:            entity.PollStatusOpen,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if in.CloseAt != nil && *in.CloseAt > 0 {
		p.CloseAt = time.Unix(*in.CloseAt, 0)
	}
	return ps.pollRepo.WithTx(ctx, func(ctx context.Context, sess *xorm.Session) error {
		if err := ps.pollRepo.InsertPoll(ctx, sess, p); err != nil {
			return err
		}
		for i, opt := range in.Options {
			oid, err := ps.uniqueIDRepo.GenUniqueIDStr(ctx, constant.QuestionPollOptionObjectType)
			if err != nil {
				return err
			}
			oid = uid.DeShortID(oid)
			row := &entity.QuestionPollOption{
				ID:         oid,
				QuestionID: qid,
				SortOrder:  i,
				Label:      opt.Label,
				Active:     1,
				CreatedAt:  now,
			}
			if err := ps.pollRepo.InsertOption(ctx, sess, row); err != nil {
				return err
			}
		}
		return nil
	})
}

// UpdatePollForQuestion applies moderator edits to poll configuration and options.
func (ps *PollService) UpdatePollForQuestion(ctx context.Context, questionID string, patch *schema.PollUpdateInput) error {
	if patch == nil {
		return nil
	}
	qid := uid.DeShortID(questionID)
	meta, has, err := ps.pollRepo.GetPoll(ctx, qid)
	if err != nil {
		return err
	}
	if !has {
		return errors.BadRequest(reason.PollNotFound)
	}
	now := time.Now()
	cols := make([]string, 0)
	if patch.MaxChoicesPerUser != nil {
		meta.MaxChoicesPerUser = *patch.MaxChoicesPerUser
		if meta.MaxChoicesPerUser < 1 {
			meta.MaxChoicesPerUser = 1
		}
		cols = append(cols, "max_choices_per_user")
	}
	if patch.AllowChangeVote != nil {
		meta.AllowChangeVote = boolToInt(*patch.AllowChangeVote)
		cols = append(cols, "allow_change_vote")
	}
	if patch.ResultVisibility != nil {
		meta.ResultVisibility = normalizeResultVisibility(*patch.ResultVisibility)
		cols = append(cols, "result_visibility")
	}
	if patch.CloseAt != nil {
		if *patch.CloseAt <= 0 {
			meta.CloseAt = time.Time{}
		} else {
			meta.CloseAt = time.Unix(*patch.CloseAt, 0)
		}
		cols = append(cols, "close_at")
	}
	if patch.Status != nil {
		if *patch.Status == entity.PollStatusClosed || *patch.Status == entity.PollStatusOpen {
			meta.Status = *patch.Status
			cols = append(cols, "status")
		}
	}
	if len(cols) > 0 {
		meta.UpdatedAt = now
		cols = append(cols, "updated_at")
		meta.QuestionID = qid
		if err := ps.pollRepo.UpdatePollCols(ctx, nil, meta, cols); err != nil {
			return err
		}
	}

	if len(patch.Options) == 0 {
		metaReload, _, e := ps.pollRepo.GetPoll(ctx, qid)
		if e != nil {
			return e
		}
		return ps.validateMaxChoicesAgainstOptions(ctx, qid, metaReload.MaxChoicesPerUser)
	}

	txErr := ps.pollRepo.WithTx(ctx, func(ctx context.Context, sess *xorm.Session) error {
		opts, err := ps.pollRepo.ListOptionsByQuestion(ctx, qid)
		if err != nil {
			return err
		}
		existingByID := make(map[string]*entity.QuestionPollOption, len(opts))
		for _, o := range opts {
			existingByID[o.ID] = o
		}
		nextSort := 0
		for _, line := range patch.Options {
			if line.ID != "" {
				oid := uid.DeShortID(line.ID)
				cur, ok := existingByID[oid]
				if !ok {
					continue
				}
				upCols := make([]string, 0)
				if line.Label != "" && cur.Label != line.Label {
					cur.Label = line.Label
					upCols = append(upCols, "label")
				}
				if line.Active != nil {
					cur.Active = boolToInt(*line.Active)
					upCols = append(upCols, "active")
				}
				cur.SortOrder = nextSort
				nextSort++
				upCols = append(upCols, "sort_order")
				if len(upCols) > 0 {
					if err := ps.pollRepo.UpdateOptionCols(ctx, sess, cur, upCols); err != nil {
						return err
					}
				}
				continue
			}
			// new option
			if line.Label == "" {
				continue
			}
			nid, err := ps.uniqueIDRepo.GenUniqueIDStr(ctx, constant.QuestionPollOptionObjectType)
			if err != nil {
				return err
			}
			nid = uid.DeShortID(nid)
			row := &entity.QuestionPollOption{
				ID:         nid,
				QuestionID: qid,
				SortOrder:  nextSort,
				Label:      line.Label,
				Active:     1,
				CreatedAt:  now,
			}
			if line.Active != nil {
				row.Active = boolToInt(*line.Active)
			}
			nextSort++
			if err := ps.pollRepo.InsertOption(ctx, sess, row); err != nil {
				return err
			}
		}
		return nil
	})
	if txErr != nil {
		return txErr
	}
	metaReload, _, e := ps.pollRepo.GetPoll(ctx, qid)
	if e != nil {
		return e
	}
	return ps.validateMaxChoicesAgainstOptions(ctx, qid, metaReload.MaxChoicesPerUser)
}

func (ps *PollService) validateMaxChoicesAgainstOptions(ctx context.Context, qid string, maxCh int) error {
	opts, err := ps.pollRepo.ListOptionsByQuestion(ctx, qid)
	if err != nil {
		return err
	}
	active := 0
	for _, o := range opts {
		if o.Active == 1 {
			active++
		}
	}
	if maxCh > active {
		return errors.BadRequest(reason.PollMaxChoicesExceeded)
	}
	return nil
}

// AttachToQuestionInfo fills resp.Poll for detail API when post_type is poll.
func (ps *PollService) AttachToQuestionInfo(ctx context.Context, resp *schema.QuestionInfoResp, viewerID string) {
	if resp == nil || resp.PostType != schema.QuestionPostTypeStrPoll {
		return
	}
	pub, err := ps.buildPublic(ctx, resp.ID, viewerID, resp.Status, ps.isStaff(ctx, viewerID))
	if err != nil {
		return
	}
	resp.Poll = pub
}

// SubmitVote validates and stores the user's ballot.
func (ps *PollService) SubmitVote(ctx context.Context, req *schema.PollVoteReq) (*schema.QuestionPollPublic, error) {
	if len(req.UserID) == 0 {
		return nil, errors.Unauthorized(reason.UnauthorizedError)
	}
	qid := uid.DeShortID(req.QuestionID)
	qinfo, has, err := ps.questionRepo.GetQuestion(ctx, qid)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.NotFound(reason.QuestionNotFound)
	}
	if qinfo.PostType != entity.QuestionPostTypePoll {
		return nil, errors.BadRequest(reason.PollNotPollQuestion)
	}
	if qinfo.Status != entity.QuestionStatusAvailable {
		return nil, errors.BadRequest(reason.PollQuestionUnavailable)
	}
	meta, hasPoll, err := ps.pollRepo.GetPoll(ctx, qid)
	if err != nil {
		return nil, err
	}
	if !hasPoll {
		return nil, errors.BadRequest(reason.PollNotFound)
	}
	if meta.Status != entity.PollStatusOpen {
		return nil, errors.BadRequest(reason.PollClosed)
	}
	if !meta.CloseAt.IsZero() && time.Now().After(meta.CloseAt) {
		return nil, errors.BadRequest(reason.PollClosed)
	}

	can, err := ps.rankService.CheckOperationPermission(ctx, req.UserID, permission.PollVote, qid)
	if err != nil {
		return nil, err
	}
	if !can {
		return nil, errors.Forbidden(reason.RankFailToMeetTheCondition)
	}

	opts, err := ps.pollRepo.ListOptionsByQuestion(ctx, qid)
	if err != nil {
		return nil, err
	}
	activeIDs := make(map[string]struct{})
	for _, o := range opts {
		if o.Active == 1 {
			activeIDs[o.ID] = struct{}{}
		}
	}
	uniq := dedupeStrings(req.OptionIDs)
	if len(uniq) == 0 {
		return nil, errors.BadRequest(reason.PollOptionInvalid)
	}
	if len(uniq) > meta.MaxChoicesPerUser {
		return nil, errors.BadRequest(reason.PollMaxChoicesExceeded)
	}
	for _, id := range uniq {
		oid := uid.DeShortID(id)
		if _, ok := activeIDs[oid]; !ok {
			return nil, errors.BadRequest(reason.PollOptionInvalid)
		}
	}

	existing, err := ps.pollRepo.ListVotesByUser(ctx, qid, req.UserID)
	if err != nil {
		return nil, err
	}
	existingSet := make(map[string]struct{}, len(existing))
	for _, v := range existing {
		existingSet[v.OptionID] = struct{}{}
	}
	newSet := make(map[string]struct{}, len(uniq))
	for _, id := range uniq {
		newSet[uid.DeShortID(id)] = struct{}{}
	}
	same := len(existingSet) == len(newSet)
	if same {
		for k := range newSet {
			if _, ok := existingSet[k]; !ok {
				same = false
				break
			}
		}
	} else {
		same = false
	}
	if len(existing) > 0 && !boolFromInt(meta.AllowChangeVote) && !same {
		return nil, errors.BadRequest(reason.PollAlreadyVotedNoChange)
	}

	if same {
		return ps.buildPublic(ctx, req.QuestionID, req.UserID, qinfo.Status, ps.isStaff(ctx, req.UserID))
	}

	now := time.Now()
	err = ps.pollRepo.WithTx(ctx, func(ctx context.Context, sess *xorm.Session) error {
		if len(existing) > 0 {
			if err := ps.pollRepo.DeleteVotesByUser(ctx, sess, qid, req.UserID); err != nil {
				return err
			}
		}
		for _, id := range uniq {
			vid, err := ps.uniqueIDRepo.GenUniqueIDStr(ctx, constant.QuestionPollVoteObjectType)
			if err != nil {
				return err
			}
			vid = uid.DeShortID(vid)
			v := &entity.QuestionPollVote{
				ID:         vid,
				QuestionID: qid,
				OptionID:   uid.DeShortID(id),
				UserID:     req.UserID,
				CreatedAt:  now,
			}
			if err := ps.pollRepo.InsertVote(ctx, sess, v); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return ps.buildPublic(ctx, req.QuestionID, req.UserID, qinfo.Status, ps.isStaff(ctx, req.UserID))
}

func boolFromInt(i int) bool {
	return i != 0
}

func dedupeStrings(in []string) []string {
	seen := make(map[string]struct{})
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s == "" {
			continue
		}
		d := uid.DeShortID(s)
		if _, ok := seen[d]; ok {
			continue
		}
		seen[d] = struct{}{}
		out = append(out, d)
	}
	return out
}

func encodeEntityID(ctx context.Context, id string) string {
	if handler.GetEnableShortID(ctx) {
		return uid.EnShortID(id)
	}
	return id
}

func (ps *PollService) buildPublic(ctx context.Context, questionID, viewerID string, qStatus int, staff bool) (*schema.QuestionPollPublic, error) {
	qid := uid.DeShortID(questionID)
	meta, has, err := ps.pollRepo.GetPoll(ctx, qid)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.BadRequest(reason.PollNotFound)
	}
	opts, err := ps.pollRepo.ListOptionsByQuestion(ctx, qid)
	if err != nil {
		return nil, err
	}
	counts, err := ps.pollRepo.CountVotesGroupedByOption(ctx, qid)
	if err != nil {
		return nil, err
	}
	participants, err := ps.pollRepo.CountDistinctVoters(ctx, qid)
	if err != nil {
		return nil, err
	}
	var viewerVotes []*entity.QuestionPollVote
	if len(viewerID) > 0 {
		viewerVotes, err = ps.pollRepo.ListVotesByUser(ctx, qid, viewerID)
		if err != nil {
			return nil, err
		}
	}
	viewerOptSet := make(map[string]struct{}, len(viewerVotes))
	viewerOptIDs := make([]string, 0, len(viewerVotes))
	for _, v := range viewerVotes {
		if _, ok := viewerOptSet[v.OptionID]; ok {
			continue
		}
		viewerOptSet[v.OptionID] = struct{}{}
		viewerOptIDs = append(viewerOptIDs, encodeEntityID(ctx, v.OptionID))
	}
	sort.Strings(viewerOptIDs)

	viewerHasVoted := len(viewerVotes) > 0
	pollClosed := meta.Status == entity.PollStatusClosed ||
		(!meta.CloseAt.IsZero() && time.Now().After(meta.CloseAt)) ||
		qStatus == entity.QuestionStatusClosed

	showCounts := staff ||
		meta.ResultVisibility == entity.PollResultVisibilityAlways ||
		(meta.ResultVisibility == entity.PollResultVisibilityAfterVote && viewerHasVoted) ||
		(meta.ResultVisibility == entity.PollResultVisibilityAfterClose && pollClosed)

	totalVotes := 0
	if showCounts {
		for _, n := range counts {
			totalVotes += n
		}
	}

	out := &schema.QuestionPollPublic{
		MaxChoicesPerUser: meta.MaxChoicesPerUser,
		AllowChangeVote:   boolFromInt(meta.AllowChangeVote),
		ResultVisibility:  meta.ResultVisibility,
		Status:            meta.Status,
		CloseAt:           0,
		ViewerHasVoted:    viewerHasVoted,
		ViewerOptionIDs:   viewerOptIDs,
		TotalParticipants: int(participants),
	}
	if !meta.CloseAt.IsZero() {
		out.CloseAt = meta.CloseAt.Unix()
	}

	canVote := len(viewerID) > 0 && qStatus == entity.QuestionStatusAvailable &&
		meta.Status == entity.PollStatusOpen &&
		(meta.CloseAt.IsZero() || !time.Now().After(meta.CloseAt))
	if canVote {
		ok, err := ps.rankService.CheckOperationPermission(ctx, viewerID, permission.PollVote, qid)
		if err != nil || !ok {
			canVote = false
		}
	}
	out.CanVote = canVote

	for _, o := range opts {
		c := counts[o.ID]
		pct := 0
		if showCounts && totalVotes > 0 {
			pct = (c * 100) / totalVotes
		}
		out.Options = append(out.Options, schema.PollOptionPublic{
			ID:         encodeEntityID(ctx, o.ID),
			Label:      o.Label,
			Active:     o.Active == 1,
			SortOrder:  o.SortOrder,
			VoteCount:  c,
			Pct:        pct,
			HideCounts: !showCounts,
		})
	}
	sort.SliceStable(out.Options, func(i, j int) bool {
		if out.Options[i].SortOrder != out.Options[j].SortOrder {
			return out.Options[i].SortOrder < out.Options[j].SortOrder
		}
		return out.Options[i].ID < out.Options[j].ID
	})
	return out, nil
}

// SyncQuestionClosed marks the poll closed when the parent question is closed.
func (ps *PollService) SyncQuestionClosed(ctx context.Context, questionID string) {
	qid := uid.DeShortID(questionID)
	meta, has, err := ps.pollRepo.GetPoll(ctx, qid)
	if err != nil || !has {
		return
	}
	meta.Status = entity.PollStatusClosed
	meta.UpdatedAt = time.Now()
	_ = ps.pollRepo.UpdatePollCols(ctx, nil, meta, []string{"status", "updated_at"})
}

// SyncQuestionReopened reopens the poll when the parent question is reopened.
func (ps *PollService) SyncQuestionReopened(ctx context.Context, questionID string) {
	qid := uid.DeShortID(questionID)
	meta, has, err := ps.pollRepo.GetPoll(ctx, qid)
	if err != nil || !has {
		return
	}
	if meta.Status != entity.PollStatusClosed {
		return
	}
	meta.Status = entity.PollStatusOpen
	meta.UpdatedAt = time.Now()
	_ = ps.pollRepo.UpdatePollCols(ctx, nil, meta, []string{"status", "updated_at"})
}
