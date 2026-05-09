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

package schema

import (
	"github.com/apache/answer/internal/entity"
)

const (
	QuestionPostTypeStrRegular = "regular"
	QuestionPostTypeStrPoll    = "poll"
)

// QuestionPostTypeFromStr maps API string to entity post_type int.
func QuestionPostTypeFromStr(s string) int {
	if s == QuestionPostTypeStrPoll {
		return entity.QuestionPostTypePoll
	}
	return entity.QuestionPostTypeRegular
}

// QuestionPostTypeToStr for JSON output.
func QuestionPostTypeToStr(t int) string {
	if t == entity.QuestionPostTypePoll {
		return QuestionPostTypeStrPoll
	}
	return QuestionPostTypeStrRegular
}

// PollCreateInput payload when creating a poll question (admin/mod only).
type PollCreateInput struct {
	MaxChoicesPerUser int                `json:"max_choices_per_user"`
	AllowChangeVote   bool               `json:"allow_change_vote"`
	ResultVisibility  string             `json:"result_visibility"`
	CloseAt           *int64             `json:"close_at"` // unix seconds; omit or 0 = no scheduled close
	Options           []PollOptionInput  `json:"options"`
}

// PollOptionInput option line on create.
type PollOptionInput struct {
	Label string `json:"label" validate:"required,notblank,lte=500"`
}

// PollUpdateInput payload when editing poll metadata/options (admin/mod, poll questions only).
type PollUpdateInput struct {
	MaxChoicesPerUser *int                   `json:"max_choices_per_user"`
	AllowChangeVote   *bool                  `json:"allow_change_vote"`
	ResultVisibility  *string                `json:"result_visibility"`
	CloseAt           *int64                 `json:"close_at"`
	Status            *string                `json:"status"` // open | closed
	Options           []PollOptionUpdateLine `json:"options"`
}

// PollOptionUpdateLine create or update an option; omit ID to append.
type PollOptionUpdateLine struct {
	ID     string `json:"id"`
	Label  string `json:"label" validate:"omitempty,lte=500"`
	Active *bool  `json:"active"`
}

// QuestionPollPublic serialized on question detail.
type QuestionPollPublic struct {
	MaxChoicesPerUser int                `json:"max_choices_per_user"`
	AllowChangeVote   bool               `json:"allow_change_vote"`
	ResultVisibility  string             `json:"result_visibility"`
	Status            string             `json:"status"`
	CloseAt           int64              `json:"close_at"`
	Options           []PollOptionPublic `json:"options"`
	ViewerHasVoted    bool               `json:"viewer_has_voted"`
	ViewerOptionIDs   []string           `json:"viewer_option_ids"`
	CanVote           bool               `json:"can_vote"` // permission + question/poll state
	TotalParticipants int                `json:"total_participants"`
}

// PollOptionPublic one choice with tallies (tallies may be hidden per visibility rules).
type PollOptionPublic struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	Active     bool   `json:"active"`
	SortOrder  int    `json:"sort_order"`
	VoteCount  int    `json:"vote_count"`
	Pct        int    `json:"pct"` // 0–100 when counts visible; else 0
	HideCounts bool   `json:"hide_counts"`
}

// PollVoteReq submit or replace ballot.
type PollVoteReq struct {
	QuestionID string   `json:"question_id" validate:"required"`
	OptionIDs  []string `json:"option_ids" validate:"required,min=1"`
	UserID     string   `json:"-"`
}

// PollVoteResp returned after successful vote.
type PollVoteResp struct {
	Poll *QuestionPollPublic `json:"poll"`
}
