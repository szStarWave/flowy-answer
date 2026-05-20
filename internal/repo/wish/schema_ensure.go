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

package wish

import (
	"context"
	"fmt"
	"time"

	"github.com/apache/answer/internal/entity"
	"xorm.io/xorm"
)

var wishTimestampFloor = time.Date(1971, 1, 1, 0, 0, 0, 0, time.UTC)

func (r *WishRepo) session(ctx context.Context) (*xorm.Session, error) {
	r.schemaOnce.Do(func() {
		r.schemaErr = ensureWishSchema(ctx, r.data.DB)
	})
	if r.schemaErr != nil {
		return nil, r.schemaErr
	}
	return r.data.DB.Context(ctx), nil
}

func ensureWishSchema(ctx context.Context, engine *xorm.Engine) error {
	if err := engine.Context(ctx).Sync(new(entity.Wish), new(entity.WishVote)); err != nil {
		return fmt.Errorf("sync wish tables: %w", err)
	}
	if err := engine.Context(ctx).Sync(new(entity.WishPeriod)); err != nil {
		return fmt.Errorf("sync wish_period: %w", err)
	}
	if err := engine.Context(ctx).Sync(new(entity.Wish)); err != nil {
		return fmt.Errorf("sync wish columns: %w", err)
	}

	var periodCount int64
	periodCount, err := engine.Context(ctx).Count(&entity.WishPeriod{})
	if err != nil {
		return err
	}
	if periodCount == 0 {
		p := &entity.WishPeriod{
			Title:       "默认期",
			Description: "历史许愿项",
			Status:      entity.WishPeriodStatusOpen,
			IsCurrent:   1,
			SortOrder:   0,
		}
		if _, err = engine.Context(ctx).Insert(p); err != nil {
			return err
		}
		if _, err = engine.Context(ctx).Exec(
			"UPDATE wish SET period_id = ? WHERE period_id = 0 OR period_id IS NULL",
			p.ID,
		); err != nil {
			return err
		}
	}
	return repairWishTimestamps(ctx, engine)
}

func repairWishTimestamps(ctx context.Context, engine *xorm.Engine) error {
	floor := wishTimestampFloor
	_, err := engine.Context(ctx).Exec(
		"UPDATE wish_period SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at < ?",
		floor,
	)
	if err != nil {
		return err
	}
	_, err = engine.Context(ctx).Exec(
		"UPDATE wish SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at < ?",
		floor,
	)
	if err != nil {
		return err
	}
	_, err = engine.Context(ctx).Exec(
		"UPDATE wish_vote SET created_at = CURRENT_TIMESTAMP WHERE created_at < ?",
		floor,
	)
	return err
}
