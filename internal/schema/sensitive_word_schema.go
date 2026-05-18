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

package schema

// SensitiveWordAdminPageReq lists dictionary entries.
type SensitiveWordAdminPageReq struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

// SensitiveWordAdminItem is one row for the admin UI.
type SensitiveWordAdminItem struct {
	ID        int64  `json:"id"`
	Word      string `json:"word"`
	Status    int    `json:"status"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

// SensitiveWordAdminAddReq adds a prohibited substring.
type SensitiveWordAdminAddReq struct {
	Word string `validate:"required,notblank,lte=191" json:"word"`
}

// SensitiveWordAdminAddResp returns created id.
type SensitiveWordAdminAddResp struct {
	ID int64 `json:"id"`
}

// SensitiveWordAdminSetStatusReq toggles enabled state.
type SensitiveWordAdminSetStatusReq struct {
	ID     int64 `validate:"required" json:"id"`
	Status int   `validate:"required,oneof=1 2" json:"status"`
}

// SensitiveWordAdminDeleteReq deletes by id.
type SensitiveWordAdminDeleteReq struct {
	ID int64 `validate:"required" json:"id"`
}
