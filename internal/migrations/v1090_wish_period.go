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
	"xorm.io/xorm"
)

func addWishPeriodTables(ctx context.Context, x *xorm.Engine) error {
	if err := x.Context(ctx).Sync(new(entity.WishPeriod)); err != nil {
		return fmt.Errorf("sync wish_period: %w", err)
	}
	if err := x.Context(ctx).Sync(new(entity.Wish)); err != nil {
		return fmt.Errorf("sync wish columns: %w", err)
	}
	var periodCount int64
	periodCount, err := x.Context(ctx).Count(&entity.WishPeriod{})
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
		if _, err = x.Context(ctx).Insert(p); err != nil {
			return err
		}
		if _, err = x.Context(ctx).Exec(
			"UPDATE wish SET period_id = ? WHERE period_id = 0 OR period_id IS NULL",
			p.ID,
		); err != nil {
			return err
		}
	}
	return nil
}
