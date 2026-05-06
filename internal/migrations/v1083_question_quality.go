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

func addQuestionQuality(ctx context.Context, x *xorm.Engine) error {
	if err := x.Context(ctx).Sync(new(entity.Question)); err != nil {
		return fmt.Errorf("sync question quality column failed: %w", err)
	}

	powers := []*entity.Power{
		{ID: 42, Name: "question mark featured", PowerType: permission.QuestionMarkFeatured, Description: "mark question as featured for tag ordering"},
		{ID: 43, Name: "question unmark featured", PowerType: permission.QuestionUnmarkFeatured, Description: "remove featured mark from question"},
	}
	for _, power := range powers {
		exist, err := x.Context(ctx).Get(&entity.Power{ID: power.ID})
		if err != nil {
			return err
		}
		if exist {
			_, err = x.Context(ctx).ID(power.ID).Update(power)
		} else {
			_, err = x.Context(ctx).Insert(power)
		}
		if err != nil {
			return err
		}
	}

	rolePowerRels := []*entity.RolePowerRel{
		{RoleID: 2, PowerType: permission.QuestionMarkFeatured},
		{RoleID: 2, PowerType: permission.QuestionUnmarkFeatured},
		{RoleID: 3, PowerType: permission.QuestionMarkFeatured},
		{RoleID: 3, PowerType: permission.QuestionUnmarkFeatured},
	}
	for _, rel := range rolePowerRels {
		exist, err := x.Context(ctx).Get(&entity.RolePowerRel{RoleID: rel.RoleID, PowerType: rel.PowerType})
		if err != nil {
			return err
		}
		if exist {
			continue
		}
		_, err = x.Context(ctx).Insert(rel)
		if err != nil {
			return err
		}
	}

	defaultConfigTable := []*entity.Config{
		{ID: 200, Key: "question.mark_featured", Value: `0`},
		{ID: 201, Key: "question.unmark_featured", Value: `0`},
		{ID: 202, Key: "rank.question.mark_featured", Value: `-1`},
		{ID: 203, Key: "rank.question.unmark_featured", Value: `-1`},
	}
	for _, c := range defaultConfigTable {
		exist, err := x.Context(ctx).Get(&entity.Config{ID: c.ID})
		if err != nil {
			return fmt.Errorf("get config failed: %w", err)
		}
		if exist {
			if _, err = x.Context(ctx).Update(c, &entity.Config{ID: c.ID}); err != nil {
				log.Errorf("update %+v config failed: %s", c, err)
				return fmt.Errorf("update config failed: %w", err)
			}
			continue
		}
		if _, err = x.Context(ctx).Insert(&entity.Config{ID: c.ID, Key: c.Key, Value: c.Value}); err != nil {
			log.Errorf("insert %+v config failed: %s", c, err)
			return fmt.Errorf("add config failed: %w", err)
		}
	}

	return nil
}
