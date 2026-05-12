# Flowy 论坛 → 主站站内信（论坛侧对接）

本文档仅说明 **Flowy 论坛服务端** 如何调用主站 **投递接口**，把通知写入主站用户的站内信（主站 C 端拉取与已读见 **`API.md`**「Flowy 论坛站内信（C 端）」）。

---

## 1. 前置条件

- 与主站运维约定 **`forum.ingest_secret`**（高强度随机串），**仅保存在论坛服务端**，不下发浏览器。
- 调用地址为主站 API 基址 + 下文路径；建议 **HTTPS**，有条件时配合内网 / 专线 / IP 白名单。

---

## 2. 用户如何对应到主站账号

主站 C 端用户以 **`tb_users` 的 `(channel, email)`** 唯一标识。

- **`email`**（必填）：会先 **去首尾空格并转小写** 再匹配主站。
- **`channel`**（可选）：须与用户在主站注册/登录时的 `channel` 一致；**不传时**主站使用配置项 `forum.default_user_channel`（默认 **`flowy`**）。
- 若主站找不到该用户：HTTP **404**，`errorKey` 为 `error.forum.user_not_found`。论坛侧宜打日志、避免对无效邮箱高频重试。

---

## 3. 投递接口

| 项目 | 说明 |
|------|------|
| **Method / URL** | `POST /api/v1/integration/forum/inbox/messages` |
| **Content-Type** | `application/json` |
| **Authorization** | `Bearer <与主站 forum.ingest_secret 一致的密钥>` |

### 3.1 请求体 JSON

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | RFC 邮箱 |
| `channel` | string | 否 | 与主站用户 `channel` 一致；省略则用主站 `forum.default_user_channel` |
| `forumMessageId` | string | 否 | **强烈建议**：论坛侧稳定 ID（帖/回复/通知等），用于幂等；与主站用户组合唯一 |
| `title` | string | 是 | 标题，最多 **512 个 Unicode 字符** |
| `body` | string | 是 | 正文，最多约 **60000 字节**（UTF-8） |
| `linkUrl` | string | 否 | 跳转链接，最多 **2048 个 Unicode 字符** |
| `occurredAt` | string | 是 | 论坛侧事件时间，**RFC3339 / RFC3339Nano**（如 `2026-05-06T12:00:00Z`、`2026-05-06T12:00:00+08:00`） |

### 3.2 成功响应（HTTP 200）

主站统一 JSON 包装，业务以 **`code` / `errorKey`** 为准：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 12345,
    "duplicate": false
  }
}
```

- **`duplicate: true`**：本次请求与已有 **`forumMessageId` 幂等键**重复（含并发重试合并），`id` 为已有记录主键。

### 3.3 常见错误（节选）

| HTTP | errorKey | 说明 |
|------|-----------|------|
| 400 | `error.invalid_request_body` | JSON 无法绑定 |
| 400 | `error.invalid_param`（`field: occurredAt`） | 时间格式非法 |
| 400 | `error.forum.title_too_long` / `body_too_long` / `link_too_long` / `forum_message_id_too_long` | 字段超长 |
| 401 | `error.forum.unauthorized` | Bearer 与主站配置的密钥不一致 |
| 404 | `error.forum.user_not_found` | 该邮箱 + 渠道无主站用户 |
| 503 | `error.forum.ingest_not_configured` | 主站未配置 `ingest_secret` |

---

## 4. 幂等与重试

- 同一用户、同一业务通知应 **固定使用同一个 `forumMessageId`**。
- 网络超时等场景可 **安全重试**；主站对 `(user_id, forum_message_id)` 去重。
- **不传 `forumMessageId`**：主站不对论坛侧去重，可能产生多条记录。

---

## 5. 安全与日志

- 日志中勿输出完整密钥与敏感正文（按合规要求脱敏）。
- 若论坛为 gRPC 等栈，可在网关做 **gRPC → HTTP**，请求体字段与上表 JSON 一致即可。

---

## 6. 调用示例（curl）

```bash
curl -sS -X POST 'https://<API_HOST>/api/v1/integration/forum/inbox/messages' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ingest_secret>' \
  -d '{
    "email": "user@example.com",
    "channel": "flowy",
    "forumMessageId": "forum-notify-20260506-abc",
    "title": "您在论坛有一条新回复",
    "body": "某某回复了您的帖子 …",
    "linkUrl": "https://forum.example.com/t/123",
    "occurredAt": "2026-05-06T12:00:00+08:00"
  }'
```
