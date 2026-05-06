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

package migrations

import (
	"context"
	"encoding/json"

	"github.com/apache/answer/internal/base/constant"
	"github.com/apache/answer/internal/base/reason"
	"github.com/apache/answer/internal/entity"
	"github.com/segmentfault/pacman/errors"
	"xorm.io/builder"
	"xorm.io/xorm"
)

// addQuestionPostRateLimitSettings merges default user posting rate limits into site questions JSON.
func addQuestionPostRateLimitSettings(ctx context.Context, x *xorm.Engine) error {
	row := &entity.SiteInfo{}
	exist, err := x.Context(ctx).Where(builder.Eq{"type": constant.SiteTypeQuestions}).Get(row)
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	if !exist {
		return nil
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(row.Content), &m); err != nil {
		return err
	}
	changed := false
	if _, ok := m["user_daily_question_limit"]; !ok {
		m["user_daily_question_limit"] = 20
		changed = true
	}
	if _, ok := m["user_question_interval_seconds"]; !ok {
		m["user_question_interval_seconds"] = 120
		changed = true
	}
	if _, ok := m["user_comment_interval_seconds"]; !ok {
		m["user_comment_interval_seconds"] = 15
		changed = true
	}
	if !changed {
		return nil
	}
	b, err := json.Marshal(m)
	if err != nil {
		return err
	}
	_, err = x.Context(ctx).Where(builder.Eq{"type": constant.SiteTypeQuestions}).Cols("content").Update(&entity.SiteInfo{
		Content: string(b),
	})
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}
