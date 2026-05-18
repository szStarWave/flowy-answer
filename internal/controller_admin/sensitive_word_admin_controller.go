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
	"github.com/apache/answer/internal/service/sensitive_word"
	"github.com/gin-gonic/gin"
)

// SensitiveWordAdminController admin CRUD for sensitive words.
type SensitiveWordAdminController struct {
	svc *sensitive_word.SensitiveWordService
}

// NewSensitiveWordAdminController constructs the controller.
func NewSensitiveWordAdminController(svc *sensitive_word.SensitiveWordService) *SensitiveWordAdminController {
	return &SensitiveWordAdminController{svc: svc}
}

// GetSensitiveWordPage paginates dictionary rows.
// @Router /answer/admin/api/sensitive-words/page [get]
func (c *SensitiveWordAdminController) GetSensitiveWordPage(ctx *gin.Context) {
	req := &schema.SensitiveWordAdminPageReq{}
	_ = ctx.ShouldBindQuery(req)
	resp, err := c.svc.AdminPage(ctx, req)
	handler.HandleResponse(ctx, err, resp)
}

// AddSensitiveWord adds a word.
// @Router /answer/admin/api/sensitive-word [post]
func (c *SensitiveWordAdminController) AddSensitiveWord(ctx *gin.Context) {
	req := &schema.SensitiveWordAdminAddReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	resp, err := c.svc.AdminAdd(ctx, req)
	handler.HandleResponse(ctx, err, resp)
}

// SetSensitiveWordStatus enables or disables a word.
// @Router /answer/admin/api/sensitive-word/status [put]
func (c *SensitiveWordAdminController) SetSensitiveWordStatus(ctx *gin.Context) {
	req := &schema.SensitiveWordAdminSetStatusReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminSetStatus(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}

// DeleteSensitiveWord removes a word.
// @Router /answer/admin/api/sensitive-word [delete]
func (c *SensitiveWordAdminController) DeleteSensitiveWord(ctx *gin.Context) {
	req := &schema.SensitiveWordAdminDeleteReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	err := c.svc.AdminDelete(ctx, req)
	handler.HandleResponse(ctx, err, nil)
}
