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

package entity

import "time"

const (
	PollResultVisibilityAlways    = "always"
	PollResultVisibilityAfterVote = "after_vote"
	PollResultVisibilityAfterClose = "after_close"

	PollStatusOpen   = "open"
	PollStatusClosed = "closed"
)

// QuestionPoll 1:1 extension for questions with PostTypePoll.
type QuestionPoll struct {
	QuestionID         string    `xorm:"not null pk BIGINT(20) question_id"`
	MaxChoicesPerUser  int       `xorm:"not null default 1 INT(11) max_choices_per_user"`
	AllowChangeVote    int       `xorm:"not null default 0 TINYINT(1) allow_change_vote"`
	ResultVisibility   string    `xorm:"not null default 'always' VARCHAR(32) result_visibility"`
	Status             string    `xorm:"not null default 'open' VARCHAR(16) status"`
	CloseAt            time.Time `xorm:"close_at TIMESTAMP"`
	CreatedAt          time.Time `xorm:"not null default CURRENT_TIMESTAMP TIMESTAMP created_at"`
	UpdatedAt          time.Time `xorm:"updated TIMESTAMP updated_at"`
}

func (QuestionPoll) TableName() string {
	return "question_poll"
}

// QuestionPollOption a selectable choice; inactive options stay for historical tallies.
type QuestionPollOption struct {
	ID         string    `xorm:"not null pk BIGINT(20) id"`
	QuestionID string    `xorm:"not null BIGINT(20) INDEX idx_qpollopt_qid question_id"`
	SortOrder  int       `xorm:"not null default 0 INT(11) sort_order"`
	Label      string    `xorm:"not null VARCHAR(500) label"`
	Active     int       `xorm:"not null default 1 TINYINT(1) active"`
	CreatedAt  time.Time `xorm:"not null default CURRENT_TIMESTAMP TIMESTAMP created_at"`
}

func (QuestionPollOption) TableName() string {
	return "question_poll_option"
}

// QuestionPollVote one row per (user, option); multi-select uses multiple rows.
type QuestionPollVote struct {
	ID         string    `xorm:"not null pk BIGINT(20) id"`
	QuestionID string    `xorm:"not null BIGINT(20) INDEX idx_qpollvote_qid question_id"`
	OptionID   string    `xorm:"not null BIGINT(20) INDEX idx_qpollvote_oid option_id"`
	UserID     string    `xorm:"not null BIGINT(20) INDEX idx_qpollvote_uid user_id"`
	CreatedAt  time.Time `xorm:"not null default CURRENT_TIMESTAMP TIMESTAMP created_at"`
}

func (QuestionPollVote) TableName() string {
	return "question_poll_vote"
}
