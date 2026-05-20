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

// WishListReq public wish list.
type WishListReq struct {
	PeriodID int64 `validate:"omitempty,min=0" form:"period_id"`
	Page     int   `validate:"omitempty,min=1" form:"page"`
	PageSize int   `validate:"omitempty,min=1,max=50" form:"page_size"`
}

// WishPeriodResp one voting period.
type WishPeriodResp struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Status      int    `json:"status"`
	IsCurrent   bool   `json:"is_current"`
	SortOrder   int    `json:"sort_order"`
	ItemCount   int    `json:"item_count,omitempty"`
	CreatedAt   int64  `json:"created_at"`
	UpdatedAt   int64  `json:"updated_at"`
}

// WishPeriodListResp periods for public or admin.
type WishPeriodListResp struct {
	Count int               `json:"count"`
	List  []*WishPeriodResp `json:"list"`
}

// WishPeriodWithItemsResp period plus its wish items (public page).
type WishPeriodWithItemsResp struct {
	Period *WishPeriodResp `json:"period"`
	Items  []*WishItemResp `json:"items"`
}

// WishItemResp one wish row for clients.
type WishItemResp struct {
	ID              int64  `json:"id"`
	PeriodID        int64  `json:"period_id,omitempty"`
	SortOrder       int    `json:"sort_order,omitempty"`
	Title           string `json:"title"`
	Description     string `json:"description,omitempty"`
	VoteCount       int    `json:"vote_count"`
	ViewCount       int    `json:"view_count"`
	DiscussionCount int    `json:"discussion_count"`
	Status          int    `json:"status,omitempty"`
	Voted           bool   `json:"voted,omitempty"`
	CreatedAt       int64  `json:"created_at"`
	UpdatedAt       int64  `json:"updated_at"`
}

// WishListResp paginated wishes.
type WishListResp struct {
	Count int             `json:"count"`
	List  []*WishItemResp `json:"list"`
}

// WishVoteReq toggles vote on a wish.
type WishVoteReq struct {
	WishID int64 `validate:"required,min=1" json:"wish_id"`
}

// WishVoteResp after voting.
type WishVoteResp struct {
	VoteCount int  `json:"vote_count"`
	Voted     bool `json:"voted"`
}

// WishAdminPageReq admin list.
type WishAdminPageReq struct {
	PeriodID int64 `validate:"omitempty,min=0" form:"period_id"`
	Page     int   `validate:"omitempty,min=1" form:"page"`
	PageSize int   `validate:"omitempty,min=1,max=100" form:"page_size"`
}

// WishAdminAddReq create wish.
type WishAdminAddReq struct {
	PeriodID        int64  `validate:"required,min=1" json:"period_id"`
	Title           string `validate:"required,gte=2,lte=255" json:"title"`
	Description     string `validate:"omitempty,lte=65535" json:"description"`
	DiscussionCount int    `validate:"omitempty,gte=0" json:"discussion_count"`
	SortOrder       int    `validate:"omitempty,gte=0" json:"sort_order"`
}

// WishAdminAddResp create result.
type WishAdminAddResp struct {
	ID int64 `json:"id"`
}

// WishAdminUpdateReq update wish.
type WishAdminUpdateReq struct {
	ID              int64  `validate:"required,min=1" json:"id"`
	Title           string `validate:"required,gte=2,lte=255" json:"title"`
	Description     string `validate:"omitempty,lte=65535" json:"description"`
	DiscussionCount int    `validate:"omitempty,gte=0" json:"discussion_count"`
	Status          int    `validate:"required,oneof=1 2" json:"status"`
	SortOrder       int    `validate:"omitempty,gte=0" json:"sort_order"`
}

// WishAdminDeleteReq delete wish.
type WishAdminDeleteReq struct {
	ID int64 `validate:"required,min=1" json:"id"`
}

// WishPeriodAdminAddReq create period.
type WishPeriodAdminAddReq struct {
	Title       string `validate:"required,gte=2,lte=255" json:"title"`
	Description string `validate:"omitempty,lte=65535" json:"description"`
	Status      int    `validate:"omitempty,oneof=1 2 3" json:"status"`
	SortOrder   int    `validate:"omitempty,gte=0" json:"sort_order"`
}

// WishPeriodAdminAddResp create period result.
type WishPeriodAdminAddResp struct {
	ID int64 `json:"id"`
}

// WishPeriodAdminUpdateReq update period.
type WishPeriodAdminUpdateReq struct {
	ID          int64  `validate:"required,min=1" json:"id"`
	Title       string `validate:"required,gte=2,lte=255" json:"title"`
	Description string `validate:"omitempty,lte=65535" json:"description"`
	Status      int    `validate:"required,oneof=1 2 3" json:"status"`
	SortOrder   int    `validate:"omitempty,gte=0" json:"sort_order"`
}

// WishPeriodAdminDeleteReq delete period.
type WishPeriodAdminDeleteReq struct {
	ID int64 `validate:"required,min=1" json:"id"`
}

// WishPeriodSetCurrentReq marks one period as current (homepage widget).
type WishPeriodSetCurrentReq struct {
	ID int64 `validate:"required,min=1" json:"id"`
}
