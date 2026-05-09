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
	"github.com/apache/answer/internal/base/reason"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/internal/service/content"
	"github.com/apache/answer/pkg/uid"
	"github.com/gin-gonic/gin"
	"github.com/segmentfault/pacman/errors"
)

// PollController handles structured poll voting (separate from question up/down votes).
type PollController struct {
	pollService *content.PollService
}

// NewPollController constructs PollController.
func NewPollController(pollService *content.PollService) *PollController {
	return &PollController{pollService: pollService}
}

// VotePoll submits or replaces the caller's ballot on a poll question.
// @Summary vote in poll
// @Tags Question
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param data body schema.PollVoteReq true "vote"
// @Success 200 {object} handler.RespBody{data=schema.PollVoteResp}
// @Router /answer/api/v1/question/poll/vote [post]
func (pc *PollController) VotePoll(ctx *gin.Context) {
	req := &schema.PollVoteReq{}
	if handler.BindAndCheck(ctx, req) {
		return
	}
	req.QuestionID = uid.DeShortID(req.QuestionID)
	req.UserID = middleware.GetLoginUserIDFromContext(ctx)
	if len(req.UserID) == 0 {
		handler.HandleResponse(ctx, errors.Unauthorized(reason.UnauthorizedError), nil)
		return
	}
	poll, err := pc.pollService.SubmitVote(ctx, req)
	if err != nil {
		handler.HandleResponse(ctx, err, nil)
		return
	}
	handler.HandleResponse(ctx, nil, &schema.PollVoteResp{Poll: poll})
}
