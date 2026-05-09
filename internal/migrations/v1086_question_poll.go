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
	"fmt"

	"github.com/apache/answer/internal/entity"
	"github.com/apache/answer/internal/service/permission"
	"github.com/segmentfault/pacman/log"
	"xorm.io/xorm"
)

func addQuestionPollFeature(ctx context.Context, x *xorm.Engine) error {
	// question.post_type distinguishes regular vs poll posts (required for inserts)
	if err := x.Context(ctx).Sync(new(entity.Question)); err != nil {
		return fmt.Errorf("sync question post_type column: %w", err)
	}
	if err := x.Context(ctx).Sync(
		new(entity.QuestionPoll),
		new(entity.QuestionPollOption),
		new(entity.QuestionPollVote),
	); err != nil {
		return fmt.Errorf("sync question poll tables: %w", err)
	}

	if err := addPollVotePowerAndRank(ctx, x); err != nil {
		return err
	}

	// Composite uniqueness: one vote row per user per option.
	idxSQL := fmt.Sprintf(
		"CREATE UNIQUE INDEX IF NOT EXISTS ux_question_poll_vote_qou ON %s (question_id, option_id, user_id)",
		entity.QuestionPollVote{}.TableName())
	if _, err := x.Context(ctx).Exec(idxSQL); err != nil {
		log.Warnf("question poll vote unique index (may already exist): %v", err)
	}
	return nil
}

func addPollVotePowerAndRank(ctx context.Context, x *xorm.Engine) error {
	powers := []*entity.Power{
		{ID: 44, Name: "poll vote", PowerType: permission.PollVote, Description: "vote in question polls"},
	}
	for _, power := range powers {
		exist, err := x.Context(ctx).Get(&entity.Power{PowerType: power.PowerType})
		if err != nil {
			return err
		}
		if exist {
			if _, err = x.Context(ctx).ID(power.ID).Update(power); err != nil {
				return err
			}
			continue
		}
		if _, err = x.Context(ctx).Insert(power); err != nil {
			return err
		}
	}
	rolePowerRels := []*entity.RolePowerRel{
		{RoleID: 2, PowerType: permission.PollVote},
		{RoleID: 3, PowerType: permission.PollVote},
	}
	for _, rel := range rolePowerRels {
		exist, err := x.Context(ctx).Get(&entity.RolePowerRel{RoleID: rel.RoleID, PowerType: rel.PowerType})
		if err != nil {
			return err
		}
		if exist {
			continue
		}
		if _, err = x.Context(ctx).Insert(rel); err != nil {
			return err
		}
	}
	cfg := &entity.Config{ID: 204, Key: "rank.poll.vote", Value: `1`}
	exist, err := x.Context(ctx).Get(&entity.Config{ID: cfg.ID})
	if err != nil {
		return err
	}
	if exist {
		if _, err = x.Context(ctx).Update(cfg, &entity.Config{ID: cfg.ID}); err != nil {
			return err
		}
	} else {
		if _, err = x.Context(ctx).Insert(cfg); err != nil {
			return err
		}
	}
	return nil
}
