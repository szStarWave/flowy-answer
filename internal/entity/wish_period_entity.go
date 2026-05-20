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
	WishPeriodStatusDraft  = 1
	WishPeriodStatusOpen   = 2
	WishPeriodStatusClosed = 3
)

// WishPeriod groups wish items for one voting round (e.g. monthly feature vote).
type WishPeriod struct {
	ID          int64     `xorm:"not null pk autoincr BIGINT(20) id"`
	Title       string    `xorm:"not null VARCHAR(255) title"`
	Description string    `xorm:"TEXT description"`
	Status      int       `xorm:"not null default 1 TINYINT(4) status"`
	IsCurrent   int       `xorm:"not null default 0 TINYINT(1) is_current"`
	SortOrder   int       `xorm:"not null default 0 INT(11) sort_order"`
	CreatedAt   time.Time `xorm:"not null default CURRENT_TIMESTAMP TIMESTAMP created_at"`
	UpdatedAt   time.Time `xorm:"updated TIMESTAMP updated_at"`
}

// BeforeInsert sets timestamps for MySQL (zero time is rejected).
func (p *WishPeriod) BeforeInsert() {
	now := time.Now()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = now
	}
}

// BeforeUpdate refreshes updated_at.
func (p *WishPeriod) BeforeUpdate() {
	p.UpdatedAt = time.Now()
}
