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

package wish

import (
	"context"
	"strings"
	"time"

	"github.com/apache/answer/internal/base/reason"
	"github.com/apache/answer/internal/entity"
	wishrepo "github.com/apache/answer/internal/repo/wish"
	"github.com/apache/answer/internal/schema"
	"github.com/segmentfault/pacman/errors"
)

// WishService community wish list and voting.
type WishService struct {
	repo *wishrepo.WishRepo
}

// NewWishService constructs the service.
func NewWishService(repo *wishrepo.WishRepo) *WishService {
	return &WishService{repo: repo}
}

func unixTime(t time.Time) int64 {
	if t.IsZero() {
		return 0
	}
	return t.Unix()
}

func toWishItem(row *entity.Wish, voted bool) *schema.WishItemResp {
	return &schema.WishItemResp{
		ID:              row.ID,
		PeriodID:        row.PeriodID,
		SortOrder:       row.SortOrder,
		Title:           row.Title,
		Description:     row.Description,
		VoteCount:       row.VoteCount,
		ViewCount:       row.ViewCount,
		DiscussionCount: row.DiscussionCount,
		Status:          row.Status,
		Voted:           voted,
		CreatedAt:       unixTime(row.CreatedAt),
		UpdatedAt:       unixTime(row.UpdatedAt),
	}
}

func toPeriodResp(row *entity.WishPeriod, itemCount int) *schema.WishPeriodResp {
	return &schema.WishPeriodResp{
		ID:          row.ID,
		Title:       row.Title,
		Description: row.Description,
		Status:      row.Status,
		IsCurrent:   row.IsCurrent == 1,
		SortOrder:   row.SortOrder,
		ItemCount:   itemCount,
		CreatedAt:   unixTime(row.CreatedAt),
		UpdatedAt:   unixTime(row.UpdatedAt),
	}
}

func (s *WishService) resolvePeriodID(ctx context.Context, periodID int64) (int64, error) {
	if periodID > 0 {
		_, exist, err := s.repo.GetPeriodByID(ctx, periodID)
		if err != nil {
			return 0, err
		}
		if !exist {
			return 0, errors.NotFound(reason.ObjectNotFound)
		}
		return periodID, nil
	}
	row, exist, err := s.repo.GetCurrentPeriod(ctx)
	if err != nil {
		return 0, err
	}
	if !exist {
		rows, err := s.repo.ListOpenPeriods(ctx)
		if err != nil || len(rows) == 0 {
			return 0, errors.NotFound(reason.ObjectNotFound)
		}
		return rows[0].ID, nil
	}
	return row.ID, nil
}

func (s *WishService) periodMustAcceptVotes(ctx context.Context, periodID int64) error {
	p, exist, err := s.repo.GetPeriodByID(ctx, periodID)
	if err != nil {
		return err
	}
	if !exist || p.Status != entity.WishPeriodStatusOpen {
		return errors.BadRequest(reason.RequestFormatError)
	}
	return nil
}

// ListPeriods returns open periods for tabs.
func (s *WishService) ListPeriods(ctx context.Context) (*schema.WishPeriodListResp, error) {
	rows, err := s.repo.ListOpenPeriods(ctx)
	if err != nil {
		return nil, err
	}
	list := make([]*schema.WishPeriodResp, 0, len(rows))
	for _, row := range rows {
		cnt, _ := s.repo.CountWishesByPeriod(ctx, row.ID)
		list = append(list, toPeriodResp(row, int(cnt)))
	}
	return &schema.WishPeriodListResp{Count: len(list), List: list}, nil
}

// List returns enabled wishes for a period.
func (s *WishService) List(ctx context.Context, req *schema.WishListReq, userID string) (*schema.WishListResp, error) {
	page, pageSize := req.Page, req.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 50 {
		pageSize = 50
	}
	periodID, err := s.resolvePeriodID(ctx, req.PeriodID)
	if err != nil {
		return &schema.WishListResp{Count: 0, List: []*schema.WishItemResp{}}, nil
	}
	rows, total, err := s.repo.ListEnabled(ctx, periodID, page, pageSize)
	if err != nil {
		return nil, err
	}
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	votedMap, err := s.repo.ListVotedWishIDs(ctx, userID, ids)
	if err != nil {
		return nil, err
	}
	list := make([]*schema.WishItemResp, 0, len(rows))
	for _, row := range rows {
		list = append(list, toWishItem(row, votedMap[row.ID]))
	}
	return &schema.WishListResp{Count: int(total), List: list}, nil
}

func (s *WishService) resolvePublicPeriod(ctx context.Context) (*entity.WishPeriod, error) {
	cur, exist, err := s.repo.GetCurrentPeriod(ctx)
	if err != nil {
		return nil, err
	}
	if exist && cur.Status == entity.WishPeriodStatusOpen {
		return cur, nil
	}
	rows, err := s.repo.ListOpenPeriods(ctx)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return rows[0], nil
}

// GetCurrentPeriodDetail returns current open period with top items for sidebar widget.
func (s *WishService) GetCurrentPeriodDetail(ctx context.Context, limit int, userID string) (*schema.WishPeriodWithItemsResp, error) {
	if limit < 1 {
		limit = 5
	}
	if limit > 20 {
		limit = 20
	}
	p, err := s.resolvePublicPeriod(ctx)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return &schema.WishPeriodWithItemsResp{
			Period: nil,
			Items:  []*schema.WishItemResp{},
		}, nil
	}
	periodID := p.ID
	rows, _, err := s.repo.ListEnabled(ctx, periodID, 1, limit)
	if err != nil {
		return nil, err
	}
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	votedMap, _ := s.repo.ListVotedWishIDs(ctx, userID, ids)
	items := make([]*schema.WishItemResp, 0, len(rows))
	for _, row := range rows {
		items = append(items, toWishItem(row, votedMap[row.ID]))
	}
	cnt, _ := s.repo.CountWishesByPeriod(ctx, periodID)
	return &schema.WishPeriodWithItemsResp{
		Period: toPeriodResp(p, int(cnt)),
		Items:  items,
	}, nil
}

// ToggleVote adds or removes the current user's vote.
func (s *WishService) ToggleVote(ctx context.Context, wishID int64, userID string) (*schema.WishVoteResp, error) {
	if userID == "" {
		return nil, errors.Unauthorized(reason.UnauthorizedError)
	}
	row, exist, err := s.repo.GetByID(ctx, wishID)
	if err != nil {
		return nil, err
	}
	if !exist || row.Status != entity.WishStatusEnabled {
		return nil, errors.NotFound(reason.ObjectNotFound)
	}
	if err = s.periodMustAcceptVotes(ctx, row.PeriodID); err != nil {
		return nil, err
	}
	has, err := s.repo.HasVote(ctx, wishID, userID)
	if err != nil {
		return nil, err
	}
	if has {
		if err = s.repo.RemoveVote(ctx, wishID, userID); err != nil {
			return nil, err
		}
		row.VoteCount--
		if row.VoteCount < 0 {
			row.VoteCount = 0
		}
		return &schema.WishVoteResp{VoteCount: row.VoteCount, Voted: false}, nil
	}
	otherWishID, err := s.repo.GetUserVotedWishIDInPeriod(ctx, row.PeriodID, userID)
	if err != nil {
		return nil, err
	}
	if otherWishID > 0 && otherWishID != wishID {
		return nil, errors.BadRequest(reason.WishVotePeriodLimit)
	}
	if err = s.repo.AddVote(ctx, wishID, userID); err != nil {
		return nil, err
	}
	return &schema.WishVoteResp{VoteCount: row.VoteCount + 1, Voted: true}, nil
}

// AdminPage lists wishes for admin UI.
func (s *WishService) AdminPage(ctx context.Context, req *schema.WishAdminPageReq) (*schema.WishListResp, error) {
	page, pageSize := req.Page, req.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	rows, total, err := s.repo.AdminPage(ctx, req.PeriodID, page, pageSize)
	if err != nil {
		return nil, err
	}
	list := make([]*schema.WishItemResp, 0, len(rows))
	for _, row := range rows {
		list = append(list, toWishItem(row, false))
	}
	return &schema.WishListResp{Count: int(total), List: list}, nil
}

// AdminAdd creates a wish.
func (s *WishService) AdminAdd(ctx context.Context, req *schema.WishAdminAddReq) (*schema.WishAdminAddResp, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.BadRequest(reason.RequestFormatError)
	}
	_, exist, err := s.repo.GetPeriodByID(ctx, req.PeriodID)
	if err != nil {
		return nil, err
	}
	if !exist {
		return nil, errors.NotFound(reason.ObjectNotFound)
	}
	row := &entity.Wish{
		PeriodID:        req.PeriodID,
		SortOrder:       req.SortOrder,
		Title:           title,
		Description:     strings.TrimSpace(req.Description),
		DiscussionCount: req.DiscussionCount,
		Status:          entity.WishStatusEnabled,
	}
	if err := s.repo.Add(ctx, row); err != nil {
		return nil, err
	}
	return &schema.WishAdminAddResp{ID: row.ID}, nil
}

// AdminUpdate updates a wish.
func (s *WishService) AdminUpdate(ctx context.Context, req *schema.WishAdminUpdateReq) error {
	row, exist, err := s.repo.GetByID(ctx, req.ID)
	if err != nil {
		return err
	}
	if !exist {
		return errors.NotFound(reason.ObjectNotFound)
	}
	row.Title = strings.TrimSpace(req.Title)
	row.Description = strings.TrimSpace(req.Description)
	row.DiscussionCount = req.DiscussionCount
	row.Status = req.Status
	row.SortOrder = req.SortOrder
	return s.repo.Update(ctx, row)
}

// AdminDelete removes a wish.
func (s *WishService) AdminDelete(ctx context.Context, req *schema.WishAdminDeleteReq) error {
	return s.repo.Delete(ctx, req.ID)
}

// AdminListPeriods lists all periods for admin.
func (s *WishService) AdminListPeriods(ctx context.Context) (*schema.WishPeriodListResp, error) {
	rows, err := s.repo.AdminListPeriods(ctx)
	if err != nil {
		return nil, err
	}
	list := make([]*schema.WishPeriodResp, 0, len(rows))
	for _, row := range rows {
		cnt, _ := s.repo.CountWishesByPeriod(ctx, row.ID)
		list = append(list, toPeriodResp(row, int(cnt)))
	}
	return &schema.WishPeriodListResp{Count: len(list), List: list}, nil
}

// AdminAddPeriod creates a period.
func (s *WishService) AdminAddPeriod(ctx context.Context, req *schema.WishPeriodAdminAddReq) (*schema.WishPeriodAdminAddResp, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.BadRequest(reason.RequestFormatError)
	}
	status := req.Status
	if status == 0 {
		status = entity.WishPeriodStatusDraft
	}
	row := &entity.WishPeriod{
		Title:       title,
		Description: strings.TrimSpace(req.Description),
		Status:      status,
		SortOrder:   req.SortOrder,
	}
	if err := s.repo.AddPeriod(ctx, row); err != nil {
		return nil, err
	}
	return &schema.WishPeriodAdminAddResp{ID: row.ID}, nil
}

// AdminUpdatePeriod updates a period.
func (s *WishService) AdminUpdatePeriod(ctx context.Context, req *schema.WishPeriodAdminUpdateReq) error {
	row, exist, err := s.repo.GetPeriodByID(ctx, req.ID)
	if err != nil {
		return err
	}
	if !exist {
		return errors.NotFound(reason.ObjectNotFound)
	}
	row.Title = strings.TrimSpace(req.Title)
	row.Description = strings.TrimSpace(req.Description)
	row.Status = req.Status
	row.SortOrder = req.SortOrder
	return s.repo.UpdatePeriod(ctx, row)
}

// AdminDeletePeriod deletes a period.
func (s *WishService) AdminDeletePeriod(ctx context.Context, req *schema.WishPeriodAdminDeleteReq) error {
	return s.repo.DeletePeriod(ctx, req.ID)
}

// AdminSetCurrentPeriod sets homepage current period.
func (s *WishService) AdminSetCurrentPeriod(ctx context.Context, req *schema.WishPeriodSetCurrentReq) error {
	_, exist, err := s.repo.GetPeriodByID(ctx, req.ID)
	if err != nil {
		return err
	}
	if !exist {
		return errors.NotFound(reason.ObjectNotFound)
	}
	return s.repo.SetCurrentPeriod(ctx, req.ID)
}
