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

package controller_admin

import (
	"github.com/apache/answer/internal/base/handler"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/internal/service/wish"
	"github.com/gin-gonic/gin"
)

// WishAdminController admin CRUD for wishes.
type WishAdminController struct {
	svc *wish.WishService
}

// NewWishAdminController constructs the controller.
func NewWishAdminController(svc *wish.WishService) *WishAdminController {
	return &WishAdminController{svc: svc}
}

// GetWishPage lists wishes.
// @Router /answer/admin/api/wishes/page [get]
func (c *WishAdminController) GetWishPage(ctx *gin.Context) {
	req := &schema.WishAdminPageReq{}
	_ = ctx.ShouldBindQuery(req)
	resp, err := c.svc.AdminPage(ctx, req)
	handler.HandleResponse(ctx, err, resp)
}

// AddWish creates a wish.
// @Router /answer/admin/api/wish [post]
func (c *WishAdminController) AddWish(ctx *gin.Context) {
	req := &schema.WishAdminAddReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	resp, err := c.svc.AdminAdd(ctx, req)
	handler.HandleResponse(ctx, err, resp)
}

// UpdateWish updates a wish.
// @Router /answer/admin/api/wish [put]
func (c *WishAdminController) UpdateWish(ctx *gin.Context) {
	req := &schema.WishAdminUpdateReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminUpdate(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}

// DeleteWish removes a wish.
// @Router /answer/admin/api/wish [delete]
func (c *WishAdminController) DeleteWish(ctx *gin.Context) {
	req := &schema.WishAdminDeleteReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminDelete(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}

// GetWishPeriods lists periods.
// @Router /answer/admin/api/wish/periods [get]
func (c *WishAdminController) GetWishPeriods(ctx *gin.Context) {
	resp, err := c.svc.AdminListPeriods(ctx)
	handler.HandleResponse(ctx, err, resp)
}

// AddWishPeriod creates a period.
// @Router /answer/admin/api/wish/period [post]
func (c *WishAdminController) AddWishPeriod(ctx *gin.Context) {
	req := &schema.WishPeriodAdminAddReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	resp, err := c.svc.AdminAddPeriod(ctx, req)
	handler.HandleResponse(ctx, err, resp)
}

// UpdateWishPeriod updates a period.
// @Router /answer/admin/api/wish/period [put]
func (c *WishAdminController) UpdateWishPeriod(ctx *gin.Context) {
	req := &schema.WishPeriodAdminUpdateReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminUpdatePeriod(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}

// DeleteWishPeriod deletes a period.
// @Router /answer/admin/api/wish/period [delete]
func (c *WishAdminController) DeleteWishPeriod(ctx *gin.Context) {
	req := &schema.WishPeriodAdminDeleteReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminDeletePeriod(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}

// SetCurrentWishPeriod marks period as current.
// @Router /answer/admin/api/wish/period/current [put]
func (c *WishAdminController) SetCurrentWishPeriod(ctx *gin.Context) {
	req := &schema.WishPeriodSetCurrentReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminSetCurrentPeriod(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}
