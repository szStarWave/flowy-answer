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
	"time"

	"xorm.io/xorm"
)

func repairWishInvalidTimestamps(ctx context.Context, x *xorm.Engine) error {
	floor := time.Date(1971, 1, 1, 0, 0, 0, 0, time.UTC)
	if _, err := x.Context(ctx).Exec(
		"UPDATE wish_period SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at < ?",
		floor,
	); err != nil {
		return err
	}
	if _, err := x.Context(ctx).Exec(
		"UPDATE wish SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at < ?",
		floor,
	); err != nil {
		return err
	}
	_, err := x.Context(ctx).Exec(
		"UPDATE wish_vote SET created_at = CURRENT_TIMESTAMP WHERE created_at < ?",
		floor,
	)
	return err
}
