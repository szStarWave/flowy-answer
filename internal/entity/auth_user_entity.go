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

package entity

import "time"

// UserCacheInfo User Cache Information
type UserCacheInfo struct {
	UserID      string `json:"user_id"`
	UserStatus  int    `json:"user_status"`
	EmailStatus int    `json:"email_status"`
	RoleID      int    `json:"role_id"`
	ExternalID  string `json:"external_id"`
	VisitToken  string `json:"visit_token"`
	// MutedUntil is Unix seconds when posting/comment is blocked; 0 means not muted.
	MutedUntil int64 `json:"muted_until"`
}

// MuteActiveAt returns true if the cache indicates an active mute at time `now`.
func (u *UserCacheInfo) MuteActiveAt(now time.Time) bool {
	if u == nil || u.MutedUntil <= 0 {
		return false
	}
	return now.Unix() < u.MutedUntil
}
