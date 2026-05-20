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

package controller

import (
	"github.com/apache/answer/internal/base/handler"
	"github.com/apache/answer/internal/base/middleware"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/internal/service/wish"
	"github.com/gin-gonic/gin"
)

// WishController public wish APIs.
type WishController struct {
	wishService *wish.WishService
}

// NewWishController constructs the controller.
func NewWishController(wishService *wish.WishService) *WishController {
	return &WishController{wishService: wishService}
}

// GetWishList returns paginated wishes.
// @Router /answer/api/v1/wishes [get]
func (wc *WishController) GetWishList(ctx *gin.Context) {
	req := &schema.WishListReq{}
	_ = ctx.ShouldBindQuery(req)
	userID := middleware.GetLoginUserIDFromContext(ctx)
	resp, err := wc.wishService.List(ctx, req, userID)
	handler.HandleResponse(ctx, err, resp)
}

// GetWishPeriods lists open periods.
// @Router /answer/api/v1/wish/periods [get]
func (wc *WishController) GetWishPeriods(ctx *gin.Context) {
	resp, err := wc.wishService.ListPeriods(ctx)
	handler.HandleResponse(ctx, err, resp)
}

// GetCurrentWishPeriod returns current period with items for sidebar widget.
// @Router /answer/api/v1/wish/period/current [get]
func (wc *WishController) GetCurrentWishPeriod(ctx *gin.Context) {
	userID := middleware.GetLoginUserIDFromContext(ctx)
	resp, err := wc.wishService.GetCurrentPeriodDetail(ctx, 5, userID)
	handler.HandleResponse(ctx, err, resp)
}

// VoteWish toggles vote on a wish.
// @Router /answer/api/v1/wish/vote [post]
func (wc *WishController) VoteWish(ctx *gin.Context) {
	req := &schema.WishVoteReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	userID := middleware.GetLoginUserIDFromContext(ctx)
	resp, err := wc.wishService.ToggleVote(ctx, req.WishID, userID)
	handler.HandleResponse(ctx, err, resp)
}
