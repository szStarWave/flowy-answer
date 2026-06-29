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

package forum_inbox

// Settings 论坛 → 主站站内信投递的代码配置（接口约定见仓库根目录 forum-inbox-integration.md）。
//
// 在此修改字面量即可生效。APIBaseURL 或 IngestSecret 任一项为空字符串时，不向主站发送请求（等同关闭集成）。
var Settings = struct {
	// APIBaseURL 主站投递接口的完整 URL（含路径），例如 https://api.example.com/api/v1/integration/forum/inbox/messages
	APIBaseURL string
	// IngestSecret 与主站 forum.ingest_secret 一致，对应请求头 Authorization: Bearer <本字段>
	IngestSecret string
	// UserChannel 可选；非空则在 JSON 中带上 channel；为空则请求体不传 channel，由主站使用 forum.default_user_channel
	UserChannel string
	// FirstPostRewardAPIURL 首次发帖奖励接口完整 URL（经网关代理，无需鉴权）；为空字符串时不调用
	FirstPostRewardAPIURL string
	// BroadcastTagNames 帖子若带有其中任一标签（slug 或展示名与下列字符串之一相同，英文标签忽略大小写），则对全站有邮箱用户投递「新帖」站内信
	BroadcastTagNames []string
}{
	APIBaseURL:            "https://server.flowyaipc.com/claw/integration/forum/inbox/messages",
	IngestSecret:          "5f89138a-6311-4970-a237-521b61a23592",
	UserChannel:           "flowy",
	FirstPostRewardAPIURL: "https://server.flowyaipc.com/claw/integration/forum/first-post/reward",
	BroadcastTagNames: []string{
		"官方公告",
		"使用指南",
	},
}
