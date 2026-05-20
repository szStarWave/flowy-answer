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
	WishStatusEnabled  = 1
	WishStatusDisabled = 2
)

// Wish is a community feature request entry (independent from Q&A posts).
type Wish struct {
	ID               int64     `xorm:"not null pk autoincr BIGINT(20) id"`
	PeriodID         int64     `xorm:"not null default 0 index BIGINT(20) period_id"`
	SortOrder        int       `xorm:"not null default 0 INT(11) sort_order"`
	Title            string    `xorm:"not null VARCHAR(255) title"`
	Description      string    `xorm:"TEXT description"`
	VoteCount        int       `xorm:"not null default 0 INT(11) vote_count"`
	ViewCount        int       `xorm:"not null default 0 INT(11) view_count"`
	DiscussionCount  int       `xorm:"not null default 0 INT(11) discussion_count"`
	Status           int       `xorm:"not null default 1 TINYINT(4) status"`
	CreatedAt        time.Time `xorm:"not null default CURRENT_TIMESTAMP TIMESTAMP created_at"`
	UpdatedAt        time.Time `xorm:"updated TIMESTAMP updated_at"`
}

// BeforeInsert sets timestamps for MySQL (zero time is rejected).
func (w *Wish) BeforeInsert() {
	now := time.Now()
	if w.CreatedAt.IsZero() {
		w.CreatedAt = now
	}
	if w.UpdatedAt.IsZero() {
		w.UpdatedAt = now
	}
}

// BeforeUpdate refreshes updated_at.
func (w *Wish) BeforeUpdate() {
	w.UpdatedAt = time.Now()
}

// WishVote records a user's upvote on a wish (one vote per user per wish).
type WishVote struct {
	ID        int64     `xorm:"not null pk autoincr BIGINT(20) id"`
	WishID    int64     `xorm:"not null unique(wish_user) BIGINT(20) wish_id"`
	UserID    string    `xorm:"not null unique(wish_user) VARCHAR(36) user_id"`
	CreatedAt time.Time `xorm:"not null default CURRENT_TIMESTAMP TIMESTAMP created_at"`
}

// BeforeInsert sets created_at for MySQL (zero time is rejected).
func (v *WishVote) BeforeInsert() {
	if v.CreatedAt.IsZero() {
		v.CreatedAt = time.Now()
	}
}
