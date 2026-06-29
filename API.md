# FlowyClaw API 文档

## 认证

### 1. 发送邮箱验证码

- **URL**: `/api/v1/user/getEmailRegisterValidCode`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "channel": "gmk"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": "c1f8e4d7-c8a0-4b3e-8b1e-5e6f4d8a3b1c"
    }
    ```
- **Error Response**:
  - **Code**: `400` (邮箱格式无效)
  - **Code**: `500` (发送或存储验证码失败)

### 2. 邮箱登录

- **URL**: `/api/v1/user/doLoginByEmail`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "validCode": "123456",
    "validCodeReqNo": "c1f8e4d7-c8a0-4b3e-8b1e-5e6f4d8a3b1c",
    "app": "aipc"
  }
  ```
- **说明**:
  - 可选字段 `app`：客户端 App 标识，用于为用户打上 `tb_users.app_aipc` / `app_herdsman` / `app_flowymes` 标记，并记录对应 `app_*_at` 首次登录时间，便于运营统计。取值：`aipc`、`herdsman`、`flowymes`（大小写不敏感）；未传或未知值时不更新标记。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Login successful",
      "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
- **Error Response**:
  - **Code**: `400` (请求无效或验证码错误)
  - **Code**: `500` (登录失败)

### 2.1 绑定邮箱（已登录用户）

- **URL**: `/api/v1/user/bindEmail`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <C端JWT>`
- **说明**:
  - 该接口用于第三方登录（如微信）后绑定邮箱。
  - 验证码通过 `/api/v1/user/getBindEmailValidCode` 发送（与邮箱登录验证码为两套独立校验链路）。
  - 成功绑定后，邮箱经规范化（trim、小写）写入；在**当前用户所在 channel 内**不可与其他用户重复，**不同 channel 下允许相同邮箱**。
  - 若同 channel 下该邮箱已被**其他**用户占用：仅当占用方为**纯邮箱账户**（无 `open_id`/`union_id`）且**无已支付订单**（`paid_at` 非空）时，服务端会删除该纯邮箱账户并完成绑定；若占用方已绑定微信/第三方，或存在已支付订单，则拒绝绑定（分别返回 `error.user.email_already_in_use` / `error.user.email_taken_with_benefits`）。
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "validCode": "123456",
    "validCodeReqNo": "c1f8e4d7-c8a0-4b3e-8b1e-5e6f4d8a3b1c"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
- **Error Response**:
  - **Code**: `400`（`error.auth.invalid_or_expired_verification_code`：验证码无效或已过期）
  - **Code**: `400`（`error.user.email_already_in_use`：邮箱已被使用）
  - **Code**: `401`（`error.unauthorized`：未登录/Token 无效）

### 2.1.1 发送绑定邮箱验证码（已登录用户）

- **URL**: `/api/v1/user/getBindEmailValidCode`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <C端JWT>`
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": "c1f8e4d7-c8a0-4b3e-8b1e-5e6f4d8a3b1c"
    }
    ```
- **Error Response**:
  - **Code**: `400`（`error.user.email_already_in_use`：同 channel 下该邮箱已被其他用户使用，见 2.1 说明）
  - **Code**: `401`（`error.unauthorized`：未登录/Token 无效）
  - **Code**: `500`（`error.send_verification_code_failed`：发送验证码失败）

### 3. 第三方登录回调

- **URL**: `/api/v1/auth/third/callback`
- **Method**: `GET`
- **Query Parameters**:
  - `platform`: `WECHAT` (目前仅支持微信)
  - `code`: 从第三方获取的授权码
  - `app`（可选）: 客户端 App 标识，取值 `aipc` / `herdsman` / `flowymes`，登录成功后写入用户表对应标记字段
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Login successful",
      "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
- **Error Response**:
  - **Code**: `400` (缺少 `code` 或不支持的 `platform`)
  - **Code**: `500` (微信登录失败)

### 3.1 微信公众号扫码关注登录（C 端）

与「网页 OAuth 微信登录」共用同一服务号 `app_id` / `app_secret`，用户 `openid` 与 `/api/v1/auth/third/callback?platform=WECHAT` 一致。需在配置中为对应 `channel` 填写 `wechat.<channel>.mp_server_token`（与公众平台「服务器配置」Token 一致），否则创建会话接口返回 `503`（`error.wechat_mp_login_disabled`）。若公众平台启用 **安全模式** 或 **兼容模式**，还需配置 `wechat.<channel>.mp_encoding_aes_key`（与公众平台 EncodingAESKey 一致，43 字符）；解密后的尾缀 `appid` 须与当前 `channel` 的 `app_id` 一致，故多 channel 时请仅在对应服务号的 channel 上填写该密钥。

**流程**：客户端调用 `POST /session` 获取 `sessionId` 与二维码 URL → 用户微信扫码并关注服务号（已关注用户扫码会触发 `SCAN`）→ 客户端轮询 `GET /session/status` 直至 `status=confirmed` 取得 JWT。

#### 3.1.1 创建扫码关注登录会话

- **URL**: `/api/v1/auth/wechat-mp/session`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "channel": "flowy",
    "inviteCode": ""
  }
  ```
- **字段说明**:
  - `channel`: 与邮箱登录等业务一致（可选，默认 `flowy`）
  - `inviteCode`: 可选；若填写，登录成功后服务端会尝试绑定邀请码（失败不阻断登录，与第三方 OAuth 回调行为一致）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "sessionId": "32位十六进制字符串与二维码场景值一致",
        "qrImageUrl": "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=...",
        "expiresIn": 300
      }
    }
    ```
- **Error Response**:
  - **Code**: `503`（`error.wechat_mp_login_disabled`：未配置 `mp_server_token`）
  - **Code**: `500`（`error.wechat_mp_qrcode_failed`：创建二维码失败）

#### 3.1.2 轮询登录状态

- **URL**: `/api/v1/auth/wechat-mp/session/status`
- **Method**: `GET`
- **Query Parameters**:
  - `sessionId`: 创建会话返回的 `sessionId`（必填）
- **Success Response**:
  - **Code**: `200`
  - **Body**（等待扫码/关注）:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "status": "pending" }
    }
    ```
  - **Body**（登录成功）:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "status": "confirmed",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
  - **Body**（会话已过期或不存在）:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "status": "expired" }
    }
    ```
- **Error Response**:
  - **Code**: `400`（`error.wechat_mp_session_id_required`：缺少 `sessionId`）
  - **Code**: `500`（`error.internal`）

#### 3.1.3 微信公众平台服务器 URL（仅微信服务器调用）

- **URL**: `/api/v1/auth/wechat-mp/callback`
- **Method**: `GET`（URL 校验）、`POST`（事件推送）
- **说明**:
  - 在微信公众平台「开发 — 基本配置 — 服务器配置」中将 **服务器 URL** 填为：`https://<你的域名>/api/v1/auth/wechat-mp/callback`（需与对外暴露的 API 前缀一致）。
  - **Token** 与配置项 `wechat.<channel>.mp_server_token` 一致（同一主体下多 channel 若共用同一公众号，各 channel 应配置相同 Token）。
  - **安全 / 兼容模式**（请求带 `msg_signature`，且 `GET` 的 `echostr` 或 `POST` 体含 `<Encrypt>`）：使用 `sha1(sort(token, timestamp, nonce, encrypt))` 与 `msg_signature` 比对；再用 `mp_encoding_aes_key` 做 AES-256-CBC 解密（与公众平台算法一致），并校验明文包尾 `appid` 与 `wechat.<channel>.app_id` 一致。
  - **明文模式**（未使用上述加密参数时）：`GET` 使用 `signature` 与 `sha1(sort(token, timestamp, nonce))` 验签，通过后原样返回 `echostr`；`POST` 直接解析明文 XML（不校验 `msg_signature`，兼容旧部署）。
  - `GET`（安全模式）：解密 `echostr` 得到明文字符串，将该字符串作为 HTTP 响应体返回（非密文回传）。
  - `POST`（安全模式）：解密 `<Encrypt>` 内密文得到内层 XML，再处理 `MsgType=event` 且 `Event=subscribe` 或 `SCAN`；业务处理完成后 HTTP 200 正文返回明文 `success`。

### 4. 获取用户信息

- **URL**: `/api/v1/user/me`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "id": 1,
        "created_at": "2023-10-27T10:00:00+08:00",
        "updated_at": "2023-10-27T10:00:00+08:00",
        "deleted_at": null,
        "username": "test_user",
        "password": "",
        "nickname": "Test User",
        "avatar": "http://example.com/avatar.jpg",
        "email": "test@example.com",
        "phone": "13800138000",
        "country": "CN",
        "city": "Beijing",
        "language": "zh-CN",
        "open_id": "wx_openid_123",
        "union_id": "wx_unionid_123",
        "status": 1,
        "last_login_ip": "127.0.0.1",
        "last_login_time": "2023-10-27T10:00:00+08:00",
        "currentPlan": {
          "planId": 2,
          "code": "ProMonth",
          "name": "专业版（月）",
          "nameEn": "Pro (Monthly)",
          "planPeriod": "MONTH",
          "currency": "CNY",
          "startAt": "2023-10-27T10:00:00+08:00",
          "endAt": "2023-11-26T10:00:00+08:00",
          "status": "ACTIVE",
          "source": "personal"
        },
        "currentWranglerMembership": {
          "membershipId": 20,
          "planId": 8,
          "code": "wrangler_gold",
          "name": "牧马人金卡",
          "nameEn": "Wrangler Gold",
          "planPeriod": "MONTH",
          "currency": "CNY",
          "startAt": "2026-03-25T10:00:00+08:00",
          "endAt": "2026-04-24T10:00:00+08:00",
          "status": "ACTIVE",
          "source": "purchase"
        },
        "team": {
          "teamId": 10,
          "name": "My Team",
          "role": "MEMBER",
          "ownerUserId": 1,
          "ownerUser": {
            "userId": 1,
            "nickname": "Owner",
            "avatar": "http://example.com/avatar.jpg"
          },
          "plan": {
            "planId": 3,
            "code": "TeamPro",
            "name": "团队专业版",
            "nameEn": "Team Pro",
            "currency": "CNY",
            "startAt": "2023-10-27T10:00:00+08:00",
            "endAt": "2023-11-26T10:00:00+08:00",
            "status": "ACTIVE"
          }
        }
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (Unauthorized)

### 5. 上报客户端版本类型/版本号

- **URL**: `/api/v1/user/clientPackage`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "packageType": "alpha",
    "appVersion": "1.2.3",
    "platform": "ios",
    "clientId": "device-uuid-xxx"
  }
  ```
- **字段说明**:
  - `packageType`: 版本类型（必填，例如 alpha/stable）
  - `appVersion`: 版本号（可选，建议上报以便统计“版本类型+版本号”分布）
  - `platform`: 平台（可选，例如 ios/android/web/desktop）
  - `clientId`: 客户端实例 ID（可选，用于区分同一用户多端）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success"
    }
    ```
- **Error Response**:
  - **Code**: `400` (参数非法)
  - **Code**: `401` (Unauthorized)

## OTA

### 1. 获取 OTA 安装包列表

- **URL**: `/api/v1/ota/packages`
- **Method**: `GET`
- **Query Params**:
  - `page`: 页码（默认 `1`）
  - `pageSize`: 每页条数（默认 `10`，最大 `200`）
  - `app`: 应用标识（可选，默认 `flowyclaw`）
  - `platform`: 平台（可选，例如 `windows` / `macos` / `linux`）
  - `arch`: 架构（可选，例如 `x64` / `arm64`）
  - `channel`: 包渠道（可选，例如 `stable` / `beta`）
  - `partnerChannel`: 第三方渠道（可选；预装客户，例如 `GMK` / `Lenovo`；留空表示通用包）
- **说明**:
  - 仅返回至少包含一条更新说明的记录（`bugFixes` / `newFeatures` / `improvements` 任一分类的中英文条目，或兼容字段 `release_notes_md`）；过滤逻辑与响应序列化一致（会排除 `[]`、`[""]` 等解析后为空的内容）；`total` 与分页均基于过滤后的结果集。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "list": [
          {
            "id": 1,
            "app": "flowyclaw",
            "platform": "windows",
            "arch": "x64",
            "channel": "stable",
            "partnerChannel": "LENOVO",
            "version": "1.2.3",
            "buildNumber": 0,
            "bugFixes": ["修复启动崩溃问题"],
            "bugFixesEn": ["Fix startup crash"],
            "newFeatures": ["新增离线安装包校验"],
            "newFeaturesEn": ["Add offline package verification"],
            "improvements": ["优化下载速度与断点续传"],
            "improvementsEn": ["Improve download speed and resume"],
            "isForce": 0,
            "minVersion": "1.0.0",
            "fileName": "installer.exe",
            "fileSize": 12345678,
            "sha256": "xxx",
            "modelscopeModelId": "owner/repo",
            "modelscopeRevision": "master",
            "modelscopeFilePath": "ota/...",
            "downloadUrl": "https://...",
            "status": 1,
            "sort": 0,
            "createdAt": "2026-03-12T08:00:00Z",
            "updatedAt": "2026-03-12T08:00:00Z"
          }
        ],
        "total": 1
      }
    }
    ```
- **Error Response**:
  - **Code**: `500` (查询失败)

### 2. 按版本号查询 OTA 安装包详情

- **URL**: `/api/v1/ota/packages/by-version`
- **Method**: `GET`
- **Query Params**:
  - `version`: 目标版本号（必填，语义化版本，例如 `0.2.10-alpha.20260330.0`）
  - `app`: 应用标识（可选）
  - `platform`: 平台（可选，例如 `windows` / `macos` / `linux`）
  - `arch`: 架构（可选，例如 `x86` / `x64` / `arm64`）
  - `channel`: 包渠道（可选，例如 `alpha` / `stable`）
  - `partnerChannel`: 第三方渠道（可选；预装客户，例如 `GMK` / `Lenovo`）
  - `buildNumber`: 构建号（可选；与库表唯一键一致时用于精确匹配）
- **说明**:
  - 返回指定版本对应的 OTA 记录（含 `status` 与更新日志字段），不限于已发布状态，便于客户端展示更新说明并根据 `status` 判断是否可升级。
  - 当存在多条匹配记录时，返回 `id` 最大的一条。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 1,
        "app": "flowyclaw",
        "platform": "windows",
        "arch": "x86",
        "channel": "alpha",
        "partnerChannel": "FLOWY",
        "version": "0.2.10-alpha.20260330.0",
        "buildNumber": 0,
        "bugFixes": ["修复启动崩溃问题"],
        "bugFixesEn": ["Fix startup crash"],
        "newFeatures": ["新增离线安装包校验"],
        "newFeaturesEn": ["Add offline package verification"],
        "improvements": ["优化下载速度与断点续传"],
        "improvementsEn": ["Improve download speed and resume"],
        "isForce": 0,
        "minVersion": "1.0.0",
        "fileName": "FlowyAIPC-cn-0.2.10-alpha.20260330.0-win-x64.exe",
        "fileSize": 516004208,
        "sha256": "",
        "modelscopeModelId": "",
        "modelscopeRevision": "",
        "modelscopeFilePath": "",
        "downloadUrl": "https://...",
        "status": 1,
        "sort": 0,
        "createdAt": "2026-03-12T08:00:00Z",
        "updatedAt": "2026-03-12T08:00:00Z"
      }
    }
    ```
  - **`status` 取值**: `0` 草稿（未发布）/ `1` 已发布 / `2` 已下架
- **Error Response**:
  - **Code**: `400`（`version` 或 `buildNumber` 参数非法）
  - **Code**: `404`（未找到对应版本）
  - **Code**: `500`（查询失败）

## 硬件商城

### 1. 获取硬件商品列表

- **URL**: `/api/v1/hardware/products`
- **Method**: `GET`
- **Query Params**:
  - `currency`: 币种（可选，默认 `CNY`；例如 `CNY` / `USD`）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 1,
          "name": "FlowyClaw 硬件套件",
          "nameEn": "FlowyClaw Kit",
          "description": "硬件商品介绍",
          "descriptionEn": "Hardware product description",
          "currency": "CNY",
          "originalPriceCent": 199900,
          "priceCent": 159900,
          "linkUrl": "https://example.com/product",
          "imageUrl": "https://cdn.example.com/product.jpg",
          "sort": 0
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `500` (查询失败)

## OTEL

### 1. 获取 OTEL 上报地址

- **URL**: `/api/v1/otel/reportAddrs`
- **Method**: `GET`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "otelHttpAddr": "http://39.97.165.115:4318",
        "otelGrpcAddr": "http://39.97.165.115:4317"
      }
    }
    ```
- **Error Response**:
  - **Code**: `500` (配置未加载或服务异常)

## 模型

### 1. 获取可用模型列表

- **URL**: `/api/v1/model/availableListClaw`
- **Method**: `GET`
- **Query Parameters**:
  - `category`（可选）：`tb_model.category`，默认 `1`（对话）。视频模型请传 `4`（与 `constants.ModelCategoryVideo` 一致）。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "Cloud": [
          {
            "model_name": "qwen-long",
            "model_provider": "aliyun",
            "model_type": "text-generation"
          }
        ]
      }
    }
    ```
- **Error Response**:
  - **Code**: `500` (获取模型列表失败)

### 1b. Seedance 视频生成（方舟异步任务）

- **创建任务**
  - **URL**: `/api/v1/video/generations/tasks`
  - **Method**: `POST`
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: 与方舟「创建视频生成任务」一致（JSON）。服务端将 `model` 解析为 `tb_channel_model` 中 `model_category=4` 的渠道模型（客户端 `model` 建议与可用列表一致，形如 `flowy/<tb_model.name>`），使用渠道上的 `api_key` 与方舟 `model` 调用上游；`callback_url` 若配置了 `seedance.callback_url` 则由服务端覆盖写入。
  - **成功**：`data` 仅包含 **`{ "id": <tb_video_task 自增主键> }`**，无其他字段。
- **任务列表（仅读库、分页）**
  - **URL**: `/api/v1/video/generations/tasks`
  - **Method**: `GET`
  - **Headers**: `Authorization: Bearer <token>`
  - **Query**: `page`（默认 1）、`pageSize`（默认 10，最大 200）
  - **说明**: 返回当前登录用户的全部视频任务摘要，按本地主键 `id` 倒序。`data.list` 元素与单条查询字段一致（`id`、`task_id`、`status`、`result`、`created_at`、`updated_at`）；`data.total` 为总条数。
- **查询任务（仅读库）**
  - **URL**: `/api/v1/video/generations/tasks/:id`
  - **Method**: `GET`
  - **Headers**: `Authorization: Bearer <token>`
  - **说明**: 路径 **`id` 为本地 `tb_video_task.id`（自增）**。`data.task_id` 为方舟侧任务 id；`data.result` 为保存在本地的上游任务 JSON 快照（不含内部 `_flowy` 元数据）；`data.status` 为本地状态码（1 queued / 2 running / 3 cancelled / 4 succeeded / 5 failed / 6 expired）。
- **取消或删除任务**
  - **URL**: `/api/v1/video/generations/tasks/:id`
  - **Method**: `DELETE`
  - **Headers**: `Authorization: Bearer <token>`
  - **说明**: 路径 **`id` 为本地 `tb_video_task.id`**。服务端根据记录调用方舟删除接口并将本地状态置为已取消（`3`）；若任务已取消则幂等成功。
  - **常见错误**: HTTP **`409`**、`code` **`409`**：任务仍在生成等上游冲突（`error.video_task.delete_running` 或 `error.video_task.delete_conflict`）；其他上游失败多为 **`502`**、`error.seedance_upstream_failed`。
- **方舟回调（无需登录）**
  - **URL**: `/api/v1/video/generations/callback`
  - **Method**: `POST`
  - **说明**: 与配置中 `seedance.callback_url` 路径一致。成功接收返回 HTTP `200`（无业务 JSON 包装要求，方舟以状态码为准）。

### 2. 上报本地模型调用（仅计价，不扣费）

- **URL**: `/api/v1/model/localUsage/report`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - C 端在本地模型推理完成后上报 Token 用量；服务端按配置项 `model.local_model_billing_channel_model`（**tb_channel_model.model**）匹配渠道模型，取其 input/output 单价计算**等价云端积分**（公式与 `/v1/chat/completions` 一致），供客户端展示「已为您节省 xxx 积分」等文案。
  - **不扣减**用户积分余额；记录写入 `tb_user_local_model_call` 供运营统计。
  - 同一用户下 `idempotencyKey` 重复上报返回已存在记录（`duplicate=true`），不重复落库。
- **Request Body**:
  - `modelId`（可选）：客户端本地模型标识，未传或空字符串时仍会计价并落库，`localModelId` 响应为空
  - `idempotencyKey`（必填）：同一用户下幂等键，最长 128 字符
  ```json
  {
    "modelId": "Qwen3.5_4b",
    "promptTokens": 1200,
    "completionTokens": 400,
    "cacheTokens": 0,
    "sessionId": "sess-abc",
    "clientId": "PC",
    "idempotencyKey": "call-uuid-001",
    "extra": {}
  }
  ```
- **Success Response** (`data`):
  - `id`: 上报记录 ID
  - `localModelId` / `billingChannelModelId`: 本地模型标识与计价基准渠道模型 ID
  - `savedPoints`: 按基准模型价格计算的等价云端积分（展示用「节省额度」，不从余额扣除）
  - `duplicate`: 是否为幂等重复请求
- **常见错误**:
  - `503` / `error.local_model_billing_not_configured`：未配置 `local_model_billing_channel_model`
  - `503` / `error.local_model_billing_model_not_found`：基准模型不存在或非 active

### 3. 获取模型调用记录

- **URL**: `/api/v1/model/calls`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: 页码（从 1 开始，默认 1）
  - `pageSize`: 每页条数（默认 10，最大 200）
- **说明**:
  - 返回当前登录用户的模型调用记录（按 `chat_id` 倒序）
  - `credit_consumed` 为本次调用消耗积分（从积分流水记录中计算；若无对应流水则为 0）
  - `created_at` 为 RFC3339 时间字符串（时区取决于服务端时间配置）
- **字段说明**:
  - `chat_id`: 用户对话 ID
  - `model_name`: 模型名称（`tb_models.name`）
  - `channel_model_id`: 渠道模型 ID（`tb_channel_models.id`）
  - `prompt_tokens`: 输入 tokens
  - `completion_tokens`: 输出 tokens
  - `cache_tokens`: 缓存 tokens（如适用）
  - `credit_consumed`: 积分消耗
  - `created_at`: 调用记录创建时间
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "list": [
          {
            "chat_id": 123,
            "model_name": "qwen-long",
            "channel_model_id": 10,
            "prompt_tokens": 100,
            "completion_tokens": 200,
            "cache_tokens": 50,
            "credit_consumed": 300,
            "created_at": "2026-03-09T10:00:00Z"
          }
        ],
        "total": 1
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (Unauthorized)
  - **Body**:
    ```json
    { "error": "Invalid or expired token" }
    ```
  - **Code**: `500` (获取调用记录失败)

## 智能语音（阿里云 ASR）（C 端）

以下接口需 **`Authorization: Bearer <token>`**（C 端用户 JWT）。用于客户端在调用阿里云智能语音（NLS）实时识别等能力：可先拉取 **AppKey**（中英各一），再按需获取经服务端 RSA 公钥加密后的 **Token**；**明文 Token 仅在服务端内存中处理，不直接下发**。

### 1. 获取阿里云 ASR Token（RSA 加密）

- **URL**: `/api/v1/asr/aliyunAsrToken`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 服务端调用阿里云 NLS `CreateToken` 取得短期访问 Token，再使用配置的 **RSA 公钥**对明文 Token 做 `RSA/ECB/PKCS1Padding` 加密，将 **Base64 编码的密文**置于响应 `data.token`。
  - 客户端需使用与公钥配对的 **私钥**解密后，再传入阿里云语音 SDK（解密算法需与加密侧一致：`RSA/ECB/PKCS1Padding`）。
  - `expireTime` 与阿里云返回的 Token 过期时间一致（数值含义以阿里云接口为准，一般为 Unix 时间戳）。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "token": "Base64EncodedCipherText...",
        "expireTime": 1710003600
      }
    }
    ```
- **Error Response**（节选）:
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `503`（`error.asr_not_configured`：服务端未配置阿里云 AK/SK 或未配置 RSA 公钥）
  - **Code**: `502`（`error.asr_aliyun_token_failed`：调用阿里云获取 Token 失败）
  - **Code**: `500`（`error.config_not_loaded`：配置未加载；或 `error.asr_token_encrypt_failed`：RSA 加密失败）

### 2. 获取阿里云 ASR AppKey（英文 / 中文）

- **URL**: `/api/v1/asr/aliyunAsrKey`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 返回服务端配置的 NLS **应用 AppKey**：`appKeyEn` 为英文场景，`appKeyZh` 为中文场景（具体语义以阿里云控制台创建的项目为准）。
  - 未配置时对应字段为空字符串。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "appKeyEn": "yourAppKeyEn",
        "appKeyZh": "yourAppKeyZh"
      }
    }
    ```
- **Error Response**（节选）:
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `500`（`error.config_not_loaded`：配置未加载）

## AI（OpenAI 兼容）（C 端）

以下 **`/v1/*` 模型相关接口**（如 `/v1/models`、`/v1/chat/completions`、图生等）的 **`Authorization: Bearer`** 可为 **C 端用户 JWT**（通常以 `eyJ` 开头）或 **用户 API 密钥**（`flowy-` 前缀，在「用户 API 密钥」管理接口中创建）。服务端对 `flowy-` 会解析为对应 `user_id` 后走相同计费与限流；密钥解析结果会在 Redis 中按配置 `user_api_key.cache_ttl` 缓存。

另：**`/api/v1/ocr/...`、视频生成任务 `/api/v1/video/generations/...`** 与上述规则相同（JWT 或 `flowy-`）。管理类接口（如 `/api/v1/user/apiKeys`、账户信息、订单等）仍 **仅支持 JWT**。

**流式对话**：`/v1/chat/completions` 在 `stream: true` 时默认 **不** 在 SSE 末尾追加内部 `event: debug`（避免仅按 OpenAI `data:` JSON 解析的客户端把调试负载误当作补全块并校验失败）。若需要该调试事件（含路由、用量、积分等追溯 JSON），请求头加 `X-Flowy-Stream-Debug: 1`。

### 用户 API 密钥（管理，仅 C 端 JWT）

#### 1. 创建 API 密钥

- **URL**: `/api/v1/user/apiKeys`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <C 端 JWT>`
- **Body**: `{"name":"名称"}`
- **Success** `data`: `id`, `name`, `apiKey`（**仅此一次**返回完整密钥；形式为 `flowy-` 后跟仅含 `0-9`、`A-Z`、`a-z` 的随机段，默认 32 位）, `createdAt`

#### 2. 列出 API 密钥

- **URL**: `/api/v1/user/apiKeys`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <C 端 JWT>`
- **Query**: `page`（默认 `1`）、`pageSize`（默认 `10`，最大 `200`）
- **说明**: 仅返回 `status=1`（可用）的密钥，按 `id` 倒序分页。
- **Success** `data`: `list`（元素含 `id`, `name`, `apiKey`, `createdAt`, `lastUsedAt`, `status`）、`total`（总条数）

#### 3. 更新名称

- **URL**: `/api/v1/user/apiKeys/:id`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <C 端 JWT>`
- **Body**: `{"name":"新名称"}`

#### 4. 删除

- **URL**: `/api/v1/user/apiKeys/:id`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <C 端 JWT>`
- **说明**: 将密钥标记为已删除，并清除 Redis 中该 key → user_id 的缓存

### 1. 上报当前会话（Session）

- **URL**: `/v1/chat/session`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **说明**:
  - 客户端在调用 `/v1/chat/completions`、`/v1/embeddings`、`/v1/rerank` 之前，建议先调用该接口上报当前会话 ID（`sessionId`），用于后续将模型调用记录按会话聚合与追踪。
  - 该接口为高可用设计：无论参数校验失败、Redis 写入失败，接口都会返回 HTTP 200，客户端可继续发起对话请求；是否成功写入由 `data.stored` 表示。
  - 多端隔离：当前服务端将 `clientId` 固定为 `PC`（客户端无需上报）。
- **Request Body**:
  ```json
  {
    "sessionId": "sess_20260403_001"
  }
  ```
- **字段说明**:
  - `sessionId`: 会话 ID（必填，去首尾空格；最大长度 128）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "stored": true
      }
    }
    ```
- **返回字段说明**:
  - `stored`: 是否成功写入当前会话（`true` 表示会话已写入并将用于后续落库归因；`false` 表示未写入但不影响继续调用对话接口）
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `400` (登录态异常导致的用户信息不合法)

## 设备

### 1. 激活设备上报

- **URL**: `/api/v1/device/activate`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  - 必填字段：`mac`、`sn`、`activateTimestamp`、`cpuChipId`、`appVersion`
  - 可选字段：`channel`、`app`（客户端标识：`aipc`/`herdsman`/`flowymes`，未传默认 `aipc`）、`osVersion`、`xpuBrand`、`publicIP`、`countryCode`、`postal`、`latitude`、`longitude`、`isp`、`timezone`、`currency` 等
  - 说明：`latitude`/`longitude` 支持字符串或数字（例如 `"39.908823"` 或 `39.908823`）
  ```json
  {
    "mac": "00:1A:2B:3C:4D:5E",
    "sn": "SN202603030001",
    "activateTimestamp": 1741052716000,
    "cpuChipId": "CPU8888888888888888",
    "appVersion": "v2.5.1",
    "osVersion": "kernel_4.19.97",
    "xpuBrand": "NVIDIA",
    "publicIP": "112.124.xx.xx",
    "countryCode": "CN",
    "postal": "100080",
    "latitude": "39.908823",
    "longitude": "116.397470",
    "isp": "China Telecom",
    "timezone": "GMT+8",
    "currency": "CNY"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Activate successful"
    }
    ```
- **Error Response**:
  - **Code**: `400` (必填字段缺失或格式不正确)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (激活上报入库失败)
- **幂等与去重**:
  - 服务端按 `mac` + `cpuChipId` + `channel` + `clientApp` + `appVersion` + `activate_state=1` 判断是否已激活成功；已存在则返回 200 且不重复插入。
  - 同一物理机在不同客户端 App 或不同客户端版本下可各保留一条成功激活记录。

### 2. 在线心跳上报（用于统计在线用户数）

- **URL**: `/api/v1/presence/heartbeat`
- **Method**: `POST`
- **Content-Type**: `application/json`（可选；允许空 body）
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 服务端按“用户维度”统计在线数量：同一用户多端在线只记 1 个在线用户
  - 在线判断基于滑动窗口：`lastSeen >= serverTime - offlineWindowMs`
- **Request Body**（可选）:
  - `clientId`: 客户端实例 ID（建议 UUID；用于排查与未来扩展，当前统计按用户维度不依赖该字段）
  - `platform`: 平台（例如 `windows` / `macos` / `linux`）
  - `appVersion`: 客户端版本号
  - 字段说明：
    - `clientId`：客户端实例标识（可选），当前仅用于回显与后续扩展
    - `platform`：客户端平台（可选）
    - `appVersion`：客户端版本号（可选）
  ```json
  {
    "clientId": "9f0a6d6b-8b3d-4a1e-8bdf-2b8b0c3f0b9a",
    "platform": "windows",
    "appVersion": "v2.5.1"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "serverTime": "2026-03-12T08:00:00Z",
        "offlineWindowMs": 90000,
        "userId": 1,
        "clientIdAccepted": true
      }
    }
    ```
  - 返回字段说明：
    - `serverTime`：服务端时间（RFC3339）
    - `offlineWindowMs`：在线判断窗口（毫秒）；若超过该窗口未上报心跳则视为离线
    - `userId`：当前登录用户 ID（用于排查/回显）
    - `clientIdAccepted`：请求体是否携带了 `clientId`（用于排查/回显）
- **Error Response**:
  - **Code**: `400` (请求体格式不正确)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (心跳记录失败，例如 Redis 不可用)

### 3. 查询当前在线用户数（按用户维度）

- **URL**: `/api/v1/presence/onlineUsers`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 返回当前系统在线用户数（按用户维度统计）
  - 在线判断基于滑动窗口：`lastSeen >= serverTime - offlineWindowMs`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "serverTime": "2026-03-12T08:00:00Z",
        "onlineUsers": 123,
        "offlineWindowMs": 90000
      }
    }
    ```
  - 返回字段说明：
    - `serverTime`：服务端时间（RFC3339）
    - `onlineUsers`：当前在线用户数（按用户维度）
    - `offlineWindowMs`：在线判断窗口（毫秒）
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败，例如 Redis 不可用)

### 4. 客户端系统时间校准检验

- **URL**: `/api/v1/time/verify`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Accept-Language`: 可选；用于错误提示国际化（例如 `zh-CN`、`en`）
- **说明**:
  - 客户端上报当前系统时间，服务端与 UTC 下的服务器当前时间比较
  - 允许误差：小于等于 **3 分钟**（含等于）
  - 比较时双方时间均归一化为 UTC；客户端传入带时区偏移的 RFC3339 时会先换算为 UTC 再比较
- **Request Body**:
  ```json
  {
    "clientTime": "2026-06-10T12:00:00Z"
  }
  ```
  - `clientTime`（必填）：客户端当前系统时间，RFC3339 或 RFC3339Nano 字符串（建议使用 UTC，例如末尾带 `Z`）
- **Success Response**（时间正确，误差 ≤ 3 分钟）:
  - **HTTP Status**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "成功",
      "data": {
        "valid": true,
        "serverTime": "2026-06-10T12:00:01.234567890Z",
        "driftMs": 1234
      }
    }
    ```
  - 返回字段说明：
    - `valid`：固定为 `true`，表示客户端时间与服务器时间一致（在允许误差内）
    - `serverTime`：服务端当前 UTC 时间（RFC3339Nano）
    - `driftMs`：客户端时间与服务器时间的绝对偏差（毫秒）
- **Error Response**:
  - **Code**: `400`（`clientTime` 缺失、格式非法，或时间偏差 > 3 分钟）
    - 格式非法示例：`msg` 为「参数 clientTime 不合法」（`error.invalid_param`）
    - 时间偏差过大示例（中文）：`msg` 为「客户端时间与服务器时间相差超过 3 分钟（当前相差约 4 分钟），请校准系统时间」（`error.client_time_out_of_sync`）
  - **Code**: `401` (未登录或 token 无效)
- **客户端建议**:
  - 上报前将本地系统时间格式化为 UTC RFC3339（例如 `new Date().toISOString()`）
  - 收到 `400` 且 `error.client_time_out_of_sync` 对应文案时，提示用户校准操作系统时间后重试

## 套餐与计费（C 端）

### 0. 购买/支付调用流程（套餐 & 积分加量包）

#### 0.1 套餐购买流程（Plan）

1. 获取/下单/支付均需先完成登录，拿到 `token`
2. 获取可购买套餐列表：`GET /api/v1/plans`
3. 查询可用支付渠道（按商品币种过滤）：`GET /api/v1/paymentChannels?itemType=plan&itemId=...&planPeriod=...`
4. 用户选择一个 `payChannel` 后创建订单（幂等）：`POST /api/v1/orders`（响应会直接包含 `payment` 支付入口信息）
5. （可选，兼容旧流程）统一发起支付：`POST /api/v1/orders/:orderNo/pay`（服务端按订单 `pay_channel` 派发到具体支付渠道；若该订单已有支付入口信息，通常会直接复用返回）
6. 客户端按 `payment` / `/pay` 返回值展示支付信息：
   - `channel=wechatpay`：展示 `codeUrl` 二维码扫码支付
   - `channel=airwallex`：使用 `paymentIntentId/clientSecret` 走前端/SDK 支付流程
7. 支付成功后，支付渠道服务器回调（客户端不调用）：`POST /api/v1/pay/wechat/notify` / `POST /api/v1/pay/airwallex/notify`
8. 客户端可轮询查询订单：`GET /api/v1/orders/:orderNo`，直到 `status=PAID`

服务端在回调处理成功后会：
- 将订单状态更新为 `PAID`
- 写入/更新支付流水（tb_payments）
- 发放套餐积分（写入积分流水并增加余额），积分过期时间与订阅到期时间一致
- 写入用户订阅（tb_user_subscriptions），并将旧的 `ACTIVE` 订阅置为 `EXPIRED`
- 订阅期内服务端会按月为每个有效个人订阅发放套餐 `grantPoints` 积分（幂等；首月在购买成功时发放，自次月起由定时任务补发）

#### 0.2 积分加量包购买流程（Pack）

与套餐类似，区别点：
- 建议通过 `GET /api/v1/creditPacks/available` 获取“当前用户可购买”的加量包（会按用户当前订阅套餐进行过滤）
- 创建订单时 `itemType=pack`
- 创建订单响应会直接包含 `payment` 支付入口信息（如需兼容旧流程，可继续调用 `/api/v1/orders/:orderNo/pay`）
- 服务端会校验：
  - 用户必须存在未过期的 `ACTIVE` 订阅
  - 若当前订阅套餐配置了可购加量包白名单，则 `packId` 必须在白名单内
- 回调成功后仅发放积分（可选过期时间取决于 `validDays`）

#### 0.2.1 牧马人套餐购买流程（Wrangler Plan）

与普通套餐类似，区别点：
- 获取可购买牧马人套餐列表：`GET /api/v1/wranglerPlans`
- 创建订单时 `itemType=wrangler_plan`
- 支付成功后服务端不会发积分，而是立即创建新的牧马人身份记录
- 若用户原本已有生效中的牧马人身份，新身份会立即覆盖旧身份；旧身份状态会被置为 `SUPERSEDED`
- 退款成功后，对应牧马人身份应立即失效并回收（状态置为 `REVOKED`）

#### 0.3 团队套餐购买流程（Team Plan）

1. 用户先完成登录，拿到 `token`（创建团队/下单/支付需要；仅查看团队套餐列表不需要）
2. 团队 owner 创建团队：`POST /api/v1/teams`
3. 团队 owner 添加成员（按用户 ID）：`POST /api/v1/teams/:teamId/members`
4. 获取可购买团队套餐列表（免 token）：`GET /api/v1/teamPlans`
5. 查询可用支付渠道（按商品币种过滤）：`GET /api/v1/paymentChannels?itemType=team_plan&itemId=...&teamId=...`
6. 用户选择一个 `payChannel` 后创建订单（幂等）：`POST /api/v1/orders`，`itemType=team_plan`，必须携带 `teamId`（响应会直接包含 `payment` 支付入口信息）
7. （可选，兼容旧流程）统一发起支付：`POST /api/v1/orders/:orderNo/pay`
8. 支付成功后，支付渠道服务器回调（客户端不调用）：`POST /api/v1/pay/wechat/notify` / `POST /api/v1/pay/airwallex/notify`
9. 支付入账成功后：
   - 服务端会为该团队创建/续费订阅期，并按套餐 `baseSeatCount` 初始化席位
   - 服务端会自动为团队成员分配空闲席位（成员加入时优先自动入席；若成员先加入后购套餐/扩容，也会在支付成功后自动补齐入席）
   - 团队管理员可查询当前席位：`GET /api/v1/teams/:teamId/seats`
   - （可选）团队管理员可手动调整席位分配：`POST /api/v1/teams/:teamId/seats/:seatNo/assign` / `POST /api/v1/teams/:teamId/seats/:seatNo/unassign`
   - 订阅期内服务端会按月为每个“有效席位”发放 `monthlyGrantPointsPerSeat` 积分（幂等）
10. （可选）团队扩容席位：
   - 查询可用支付渠道：`GET /api/v1/paymentChannels?itemType=team_seat_expand&itemId=...&teamId=...&seatDelta=...&expandMode=...`
   - 用户选择 `payChannel` 后创建订单（幂等）：`POST /api/v1/orders`，`itemType=team_seat_expand`，必须携带 `teamId`、`seatDelta`、`expandMode`（响应会直接包含 `payment` 支付入口信息）
   - （可选，兼容旧流程）统一发起支付：`POST /api/v1/orders/:orderNo/pay`
   - 支付成功后扩容生效：`expandMode=TEMP` 时写入订阅期临时扩容；`expandMode=PERM` 时写入团队订阅永久扩容
   - 特殊规则（方案 5.2-B）：若 `expandMode=TEMP` 的扩容订单在支付成功回调时发现“目标订阅期已过期”，服务端会自动按 `PERM` 方式入账（永久扩容）

#### 0.4 团队席位权益与个人权益并存规则

- 用户在同一时间可以同时拥有个人积分余额与团队席位积分余额（来自其被分配的席位）
- 模型调用发生积分消耗时：优先消耗“席位积分”（若用户有有效席位且有余额），不足部分再消耗个人积分
- 当用户离开席位（被解绑/移出团队/主动退出等）后，不再享受该席位后续发放与余额消耗权限

#### 0.5 关键状态枚举

- 订单状态 `status`：`CREATED` / `PAYING` / `PAID` / `REFUNDED` / `EXPIRED` / `CANCELED`
  - `REFUNDED`：订单已完成全额退款，且本地权益回收已进入成功终态
- 套餐周期 `planPeriod`：`MONTH` / `HALF_YEAR` / `YEAR`
- 商品类型 `itemType`：`plan`（个人套餐） / `wrangler_plan`（牧马人套餐） / `pack`（积分加量包） / `team_plan`（团队套餐） / `team_seat_expand`（团队席位扩容）

## 活动（邀请码 / 优惠券）（C 端）

### 0. 调用流程（邀请码绑定 + 用券下单）

#### 0.1 生成/获取邀请链接（分享给别人）

1. 用户先完成登录，拿到 `token`
2. 调用 `GET /api/v1/promo/inviteCode` 获取当前用户的邀请码与邀请链接（不存在会自动生成）
3. 将 `inviteLink` 分享给被邀请用户（邀请链接 = 官网地址 + `inviteCode` 参数）
4. 被邀请用户点击邀请链接访问官网，官网从 URL 参数中获取 `inviteCode`

#### 0.2 绑定邀请码并领取双方奖励券（被邀请用户）

1. 被邀请用户先完成登录，拿到 `token`
2. 调用 `POST /api/v1/promo/bindInviteCode` 提交 `inviteCode`
3. 绑定成功后服务端会写入拉新绑定记录（tb_referral_invites），并给双方各发一张券（tb_user_coupons）
4. 绑定结果会返回双方发放的优惠券信息（`inviteeCoupon` / `inviterCoupon`）

#### 0.3 活动页领取指定优惠券（可选）

1. 用户先完成登录，拿到 `token`
2. 调用 `POST /api/v1/promo/coupons/claim` 提交 `templateCode`
3. 服务端会按模板发券（tb_coupon_templates -> tb_user_coupons），并限制同一模板每人最多领取一次

#### 0.4 查询并使用优惠券下单

1. 调用 `GET /api/v1/promo/coupons?status=ALL` 查询我的券列表
2. 选择 `status=UNUSED` 且 `expiresAt` 未过期的券，拿到 `couponId`
3. 创建订单时在 `POST /api/v1/orders` 的请求体携带 `couponId`
4. 服务端会在创建订单时将该券从 `UNUSED` 置为 `LOCKED`（关联 `lockedOrderId`）
5. 支付成功后服务端会将该券置为 `USED`（关联 `usedOrderId`）；若订单超时过期则会自动解锁回 `UNUSED` 或标记为 `EXPIRED`

### 1. 获取我的邀请码与邀请链接

- **URL**: `/api/v1/promo/inviteCode`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 返回当前登录用户的邀请码与邀请链接；若不存在会自动生成
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "inviteCode": "ABCD1234",
        "inviteLink": "https://claw.flowyaipc.cn/?inviteCode=ABCD1234"
      }
    }
    ```
  - 返回字段说明：
    - `inviteCode`：当前用户的邀请码，可分享给其他用户
    - `inviteLink`：邀请链接（官网地址 + `inviteCode` 参数），可直接分享给他人
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (生成/查询失败)

### 2. 查询我邀请的新用户列表

- **URL**: `/api/v1/promo/invitees`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: 页码，默认 `1`
  - `pageSize`: 每页数量，默认 `10`，最大 `200`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "list": [
          {
            "invitee_user_id": 123,
            "invitee_email": "user@example.com",
            "invitee_nickname": "User123",
            "invite_code": "ABCD1234",
            "created_at": "2026-03-12T08:00:00Z"
          }
        ],
        "total": 1
      }
    }
    ```
- 返回字段说明：
  - `list[]`：我邀请的新用户列表（基于 tb_referral_invites 绑定记录）
  - `list[].invitee_user_id`：被邀请用户 ID
  - `list[].invitee_email`：被邀请用户邮箱（可能为空字符串）
  - `list[].invitee_nickname`：被邀请用户昵称
  - `list[].invite_code`：使用的邀请码
  - `list[].created_at`：绑定时间（RFC3339）
  - `total`：总数
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 3. 绑定邀请码（参与拉新活动）

- **URL**: `/api/v1/promo/bindInviteCode`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "inviteCode": "ABCD1234"
  }
  ```
- 请求字段说明：
  - `inviteCode`：邀请人分享的邀请码（不区分大小写处理由客户端负责；服务端仅做 trim）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "inviterUserId": 123,
        "inviteeCoupon": {
          "id": 10001,
          "templateCode": "REFERRAL_INVITEE_1000",
          "title": "新人奖励券",
          "currency": "CNY",
          "discountCent": 1000,
          "applicableItemTypes": "all",
          "status": "UNUSED",
          "issuedAt": "2026-03-12T08:00:00Z",
          "expiresAt": "2026-04-11T08:00:00Z",
          "lockedOrderId": null,
          "usedOrderId": null
        },
        "inviterCoupon": {
          "id": 10002,
          "templateCode": "REFERRAL_INVITER_1000",
          "title": "邀请奖励券",
          "currency": "CNY",
          "discountCent": 1000,
          "applicableItemTypes": "all",
          "status": "UNUSED",
          "issuedAt": "2026-03-12T08:00:00Z",
          "expiresAt": "2026-04-11T08:00:00Z",
          "lockedOrderId": null,
          "usedOrderId": null
        }
      }
    }
    ```
- 返回字段说明：
  - `inviterUserId`：邀请人用户 ID
  - `inviteeCoupon`：被邀请人领取到的券
  - `inviterCoupon`：邀请人领取到的券
- **Error Response**:
  - **Code**: `400`
    - `invalid inviteCode`：邀请码不存在
    - `cannot invite yourself`：不能绑定自己的邀请码
    - `already joined referral activity`：该用户已绑定过邀请码（每个用户只能绑定一次）
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (绑定/发券失败)

### 4. 查询我的优惠券列表

- **URL**: `/api/v1/promo/coupons`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status`：`ALL` / `UNUSED` / `LOCKED` / `USED` / `EXPIRED` / `VOID`（默认 `ALL`）
  - `applicableItemTypes`：可选。指定只返回可适用于所列商品类型的优惠券；多个类型用英文逗号分隔，或与 `status` 等并列重复传参（如 `?applicableItemTypes=plan&applicableItemTypes=pack`）。可取值与每券 `applicableItemTypes` 段一致，例如 `plan` / `pack` / `team_plan` 等。不传则返回全部（仍受 `status` 影响）。
- **说明**:
  - 查询时会顺便将当前用户已过期且仍为 `UNUSED/LOCKED` 的券标记为 `EXPIRED`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "list": [
          {
            "id": 10001,
            "templateCode": "REFERRAL_INVITEE_1000",
            "title": "新人奖励券",
            "currency": "CNY",
            "discountCent": 1000,
            "applicableItemTypes": "all",
            "status": "UNUSED",
            "issuedAt": "2026-03-12T08:00:00Z",
            "expiresAt": "2026-04-11T08:00:00Z",
            "lockedOrderId": null,
            "usedOrderId": null
          }
        ]
      }
    }
    ```
- 返回字段说明：
  - `list[]`：优惠券数组
  - `list[].id`：用户券 ID（下单时 `couponId` 传这个值）
  - `list[].templateCode`：模板编码快照
  - `list[].title`：标题快照
  - `list[].currency`：币种
  - `list[].discountCent`：抵扣金额（分）
  - `list[].applicableItemTypes`：适用商品类型（`all/plan/pack`，可为逗号分隔）
  - `list[].status`：`UNUSED/LOCKED/USED/EXPIRED/VOID`
  - `list[].issuedAt`：发放时间（RFC3339）
  - `list[].expiresAt`：过期时间（RFC3339）
  - `list[].lockedOrderId`：锁定的订单 ID（仅当 `status=LOCKED` 时可能非空）
  - `list[].usedOrderId`：使用的订单 ID（仅当 `status=USED` 时可能非空）
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 5. 领取优惠券（按模板）

- **URL**: `/api/v1/promo/coupons/claim`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "templateCode": "PROMO_WELCOME_500"
  }
  ```
- 请求字段说明：
  - `templateCode`：优惠券模板编码（对应 tb_coupon_templates.code）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 10003,
        "templateCode": "PROMO_WELCOME_500",
        "title": "活动优惠券",
        "currency": "CNY",
        "discountCent": 500,
        "applicableItemTypes": "all",
        "status": "UNUSED",
        "issuedAt": "2026-03-12T08:00:00Z",
        "expiresAt": "2026-03-19T08:00:00Z",
        "lockedOrderId": null,
        "usedOrderId": null
      }
    }
    ```
- **Error Response**:
  - **Code**: `400`
    - `already claimed`：同一模板每个用户最多领取一次
    - `coupon template not found`：模板不存在或未启用
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (领取失败)

### 1. 获取可购买套餐列表

- **URL**: `/api/v1/plans`
- **Method**: `GET`
- **Query Parameters**:
  - `planPeriod`: 计费周期筛选（可选）。支持 `MONTH` / `HALF_YEAR` / `YEAR`
  - `currency`: 币种筛选（可选，大小写不敏感）。例如 `CNY` / `USD` / `JPY`
  - `externalChannelCode`: 三方渠道（可选）。用于按 `external_channel_code` 过滤可售目录；未登录且不传时默认 `flowy`
  - `externalChannelCode`: 三方渠道（可选，默认空字符串）。用于按 `external_channel_code` 过滤可售目录
- **说明**:
  - 同一套餐的不同计费周期按多行返回，通过 `planPeriod` 区分
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 1,
          "code": "basic",
          "planPeriod": "MONTH",
          "name": "基础月卡",
          "description": "适合轻度使用",
          "currency": "CNY",
          "currentPriceCent": 1990,
          "originalPriceCent": 2990,
          "discountEnabled": true,
          "discountRate": 0.95,
          "firstMonthDiscount": 1,
          "firstMonthPriceCent": 990,
          "userFirstMonthDiscountEligible": true,
          "durationDays": 30,
          "durationMonths": 1,
          "grantPoints": 100000,
          "modelIds": ["qwen-long"],
          "sort": 100,
          "extJson": "{}",
          "isHot": true,
          "benefitList": ["不限模型调用次数", "专属高速通道"],
          "isCurrent": false
        },
        {
          "id": 2,
          "code": "basic",
          "planPeriod": "YEAR",
          "name": "基础年卡",
          "description": "适合长期使用",
          "currency": "CNY",
          "currentPriceCent": 19900,
          "originalPriceCent": 0,
          "discountEnabled": false,
          "discountRate": 1,
          "firstMonthDiscount": 0,
          "firstMonthPriceCent": 0,
          "userFirstMonthDiscountEligible": false,
          "durationDays": 365,
          "durationMonths": 12,
          "grantPoints": 1200000,
          "modelIds": ["qwen-long"],
          "sort": 90,
          "extJson": "{}",
          "isHot": false,
          "benefitList": ["不限模型调用次数"],
          "isCurrent": true
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `400` (`planPeriod` 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (获取套餐失败)

### 1.0 获取可购买牧马人套餐列表

- **URL**: `/api/v1/wranglerPlans`
- **Method**: `GET`
- **Query Parameters**:
  - `planPeriod`: 计费周期筛选（可选）。支持 `MONTH` / `HALF_YEAR` / `YEAR`
  - `currency`: 币种筛选（可选，大小写不敏感）。例如 `CNY` / `USD`
  - `externalChannelCode`: 三方渠道（可选，默认空字符串）。用于按 `external_channel_code` 过滤可售目录
- **说明**:
  - 仅返回已上架（Published）的牧马人套餐
  - 牧马人套餐不发积分，仅用于授予对应 `code` 身份
  - 若当前用户已登录，字段 `isCurrent` 会标记是否为当前生效中的牧马人身份
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 8,
          "code": "wrangler_gold",
          "planPeriod": "MONTH",
          "name": "牧马人金卡",
          "nameEn": "Wrangler Gold",
          "description": "高级身份权益",
          "descriptionEn": "Advanced identity privileges",
          "currency": "CNY",
          "currentPriceCent": 29900,
          "originalPriceCent": 39900,
          "discountEnabled": true,
          "discountRate": 0.75,
          "durationDays": 30,
          "durationMonths": 1,
          "sort": 100,
          "isHot": true,
          "benefitList": ["身份特权A", "身份特权B"],
          "benefitListEn": ["Privilege A", "Privilege B"],
          "extJson": "{}",
          "isCurrent": true
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `500` (获取牧马人套餐失败)

### 1.1 获取可购买团队套餐列表

- **URL**: `/api/v1/teamPlans`
- **Method**: `GET`
- **Query Parameters**:
  - `currency`: 币种筛选（可选，大小写不敏感）。例如 `CNY` / `USD` / `JPY`
  - `externalChannelCode`: 三方渠道（可选，默认空字符串）。用于按 `external_channel_code` 过滤可售目录
- **说明**:
  - 仅返回已上架（Published）的团队套餐
  - 团队套餐按“周期总价”返回；下单无需传 `subscriptionMonths`，有效期与总价由套餐周期决定
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 1,
          "code": "team_basic",
          "planPeriod": "MONTH",
          "name": "团队基础版",
          "nameEn": "Team Basic",
          "description": "适合小团队",
          "descriptionEn": "For small teams",
          "currency": "CNY",
          "currentPriceCent": 9900,
          "originalPriceCent": 12900,
          "discountEnabled": true,
          "discountRate": 0.9,
          "addonSeatPriceCentPerMonthPerm": 1200,
          "addonSeatPriceCentPerMonthTemp": 1500,
          "durationDays": 30,
          "baseSeatCount": 5,
          "monthlyGrantPointsPerSeat": 50000,
          "dailyCheckInGrantPoints": 200,
          "benefitList": ["共享席位", "团队管理"],
          "benefitListEn": ["Shared seats", "Team management"],
          "sort": 100
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `500` (获取团队套餐失败)

### 2. 获取可购买积分加量包列表（不按套餐过滤）

- **URL**: `/api/v1/creditPacks`
- **Method**: `GET`
- **Query Parameters**:
  - `currency`: 币种筛选（可选，大小写不敏感）。例如 `CNY` / `USD` / `JPY`
  - `externalChannelCode`: 三方渠道（可选，默认空字符串）。用于按 `external_channel_code` 过滤可售目录
- **说明**:
  - 仅返回已上架（Published）的加量包
  - 不会按用户订阅套餐做过滤（适合未登录场景或兼容旧客户端）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 10,
          "code": "points_10w",
          "name": "10万积分包",
          "description": "有效期一年",
          "currency": "CNY",
          "priceCent": 990,
          "points": 100000,
          "validDays": 365,
          "sort": 100,
          "extJson": "{}"
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `500` (获取加量包失败)

### 3. 获取当前用户可购买积分加量包列表（按套餐过滤）

- **URL**: `/api/v1/creditPacks/available`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `currency`: 币种筛选（可选，大小写不敏感）。例如 `CNY` / `USD` / `JPY`
- **说明**:
  - 会读取用户当前未过期的 `ACTIVE` 订阅套餐，并按套餐配置的“可购加量包”白名单进行过滤
  - 若用户无有效订阅：返回空数组 `[]`
  - 若套餐未配置白名单：等同于 `GET /api/v1/creditPacks`（返回所有已上架加量包）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 10,
          "code": "points_10w",
          "name": "10万积分包",
          "description": "有效期一年",
          "currency": "CNY",
          "priceCent": 990,
          "points": 100000,
          "validDays": 365,
          "sort": 100,
          "extJson": "{}"
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (获取可购加量包失败)

### 3.1 查询当前可用积分余额

- **URL**: `/api/v1/credits/balance`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 返回当前登录用户“可用余额”（会自动排除已过期积分批次）
  - 字段 `balance` 为整数积分
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "balance": 12345
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 3.2 查询积分消耗统计（日/周/月 + 自选区间）

- **URL**: `/api/v1/credits/consumptionStats`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `dim`: 统计维度，可选 `day` / `week` / `month`（默认 `day`）
  - `startTime`: 起始时间（可选）
  - `endTime`: 结束时间（可选）
- **时间格式**:
  - `startTime/endTime` 支持以下任意一种格式：
    - 毫秒时间戳（例如 `1710000000000`）
    - RFC3339（例如 `2026-03-10T12:00:00+08:00`）
    - `2006-01-02 15:04:05`
    - `2006-01-02`
  - 当使用 `2006-01-02`（仅日期）作为 `endTime` 时，服务端会将其视为“包含当天”的结束时间。
- **默认区间规则**（当 `startTime/endTime` 都不传时）:
  - `day`：返回最近 7 天（含今天）
  - `week`：返回最近 4 周（ISO 周，周一为起始）
  - `month`：返回当年 12 个月（`YYYY-01` ~ `YYYY-12`）
- **返回说明**:
  - `list` 会补齐区间内缺失的 bucket（消耗为 0）
  - `bucket` 格式：
    - `day`：`YYYY-MM-DD`
    - `week`：`YYYY-Www`（ISO 周，例如 `2026-W10`）
    - `month`：`YYYY-MM`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "dim": "day",
        "startTime": "2026-03-04T00:00:00+08:00",
        "endTime": "2026-03-10T23:59:59.999+08:00",
        "total": 120,
        "list": [
          { "bucket": "2026-03-04", "consumed": 0 },
          { "bucket": "2026-03-05", "consumed": 20 },
          { "bucket": "2026-03-06", "consumed": 0 },
          { "bucket": "2026-03-07", "consumed": 30 },
          { "bucket": "2026-03-08", "consumed": 10 },
          { "bucket": "2026-03-09", "consumed": 0 },
          { "bucket": "2026-03-10", "consumed": 60 }
        ]
      }
    }
    ```
- **Error Response**:
  - **Code**: `400` (时间参数不合法或区间不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 3.3 每日签到（每日一次，赠送 200 积分）

- **URL**: `/api/v1/credits/checkin`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 每个用户每天最多签到一次（以客户端传入的 `timeZone` 对应的日期为准）
  - 首次签到会赠送 `200` 积分；重复签到会返回 `alreadyCheckedIn=true` 且 `grantedPoints=0`
  - 签到赠送的积分会在该用户当日 `24:00`（签到时区）过期
  - 返回字段 `balance` 为签到后的“可用余额”
- **Query Parameters**:
  - `timeZone`: 时区（可选，IANA 名称，例如 `Asia/Shanghai`）
- **Request Body**（可选）:
  ```json
  {
    "timeZone": "Asia/Shanghai"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**（首次签到示例）:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "alreadyCheckedIn": false,
        "grantedPoints": 200,
        "balance": 10200,
        "checkInAt": "2026-03-11T08:09:51.123+08:00",
        "dayKey": 20260311
      }
    }
    ```
  - **Body**（重复签到示例）:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "alreadyCheckedIn": true,
        "grantedPoints": 0,
        "balance": 10200,
        "checkInAt": "2026-03-11T08:09:51.123+08:00",
        "dayKey": 20260311
      }
    }
    ```
- **Error Response**:
  - **Code**: `400` (`timeZone` 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (签到失败)

### 3.3.1 查询我某个月的签到明细（仅已签到日期）

- **URL**: `/api/v1/credits/checkinRecords`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 仅返回“当前登录用户”指定月份内的签到记录
  - 仅返回该月已签到的日期列表，以及对应发放积分
- **Query Parameters**:
  - `month`: 目标年月，格式固定为 `yyyy-MM`，例如 `2026-03`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "month": "2026-03",
        "totalCheckInDays": 18,
        "list": [
          {
            "date": "2026-03-10",
            "day": 10,
            "dayKey": 20260310,
            "checkInAt": "2026-03-10T08:05:10.000+08:00",
            "grantedPoints": 200,
            "timeZone": "Asia/Shanghai"
          },
          {
            "date": "2026-03-11",
            "day": 11,
            "dayKey": 20260311,
            "checkInAt": "2026-03-11T08:09:51.123+08:00",
            "grantedPoints": 200,
            "timeZone": "Asia/Shanghai"
          }
        ]
      }
    }
    ```
- **Error Response**:
  - **Code**: `400` (`month` 缺失或格式不是 `yyyy-MM`)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 3.4 使用积分兑换码兑换积分

- **URL**: `/api/v1/credits/redeemCode`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **说明**:
  - 使用“运营平台创建的积分兑换码”给当前用户增加积分
  - 同一用户对同一兑换码只能兑换一次（服务端通过唯一约束保证）
  - 返回字段 `balance` 为兑换后的“可用余额”
- **Request Body**:
  ```json
  {
    "redeemCode": "ABCD2EFG3HJK"
  }
  ```
- 请求字段说明：
  - `redeemCode`：积分兑换码（字符串，必填）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "grantedPoints": 2000,
        "balance": 10200
      }
    }
    ```
- 返回字段说明：
  - `grantedPoints`：本次兑换发放的积分数额
  - `balance`：兑换后的可用余额
- **Error Response**:
  - **Code**: `400`
    - `invalid redeem code`：兑换码为空/格式不合法
    - `redeem code not found`：兑换码不存在
    - `redeem code disabled`：兑换码被禁用/数据异常
    - `redeem code exhausted`：兑换码已被兑换完（达到最大次数）
  - **Code**: `409` (`redeem code already redeemed`：该用户已兑换过该兑换码)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (兑换失败)

### 3.5 查询积分明细（增加/消耗）

- **URL**: `/api/v1/credits/ledger`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: 页码（从 1 开始，默认 1）
  - `pageSize`: 每页条数（默认 10，最大 200）
  - `startTime`: 起始时间（可选）
  - `endTime`: 结束时间（可选）
- **时间格式**:
  - `startTime/endTime` 支持以下任意一种格式：
    - 毫秒时间戳（例如 `1710000000000`）
    - RFC3339（例如 `2026-03-10T12:00:00+08:00`）
    - `2006-01-02 15:04:05`
    - `2006-01-02`
  - 当使用 `2006-01-02`（仅日期）作为 `startTime` 时，服务端会将其视为当天 `00:00:00`
  - 当使用 `2006-01-02`（仅日期）作为 `endTime` 时，服务端会将其视为“包含当天”的结束时间
- **返回说明**:
  - `balance`：当前可用余额（会自动排除已过期积分批次）
  - `delta`：本条积分变动值（正数为增加，负数为消耗）
  - `explanation`：对本条变动的解释文案
  - `expireAt`：仅对“增加积分且有过期时间”的记录返回，表示该批次积分的过期时间
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "balance": 10200,
        "total": 2,
        "list": [
          {
            "id": 1001,
            "delta": -60,
            "reason": "consume_model",
            "explanation": "模型调用消耗（gpt-4.1）",
            "occurredAt": "2026-03-11T10:01:02+08:00"
          },
          {
            "id": 999,
            "delta": 200,
            "reason": "daily_checkin",
            "explanation": "每日签到赠送",
            "occurredAt": "2026-03-11T08:09:51+08:00"
          }
        ]
      }
    }
    ```
- **Error Response**:
  - **Code**: `400` (时间参数不合法或区间不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 3.6 查询积分使用情况（按类型汇总 + 明细，含团队席位）

- **URL**: `/api/v1/credits/usageByType`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `includeTeamSeat`: 是否包含团队席位积分，默认 `1`。可选：`1/0`、`true/false`
- **说明**:
  - 仅返回“当前有效”的积分使用情况：
    - 个人积分：只统计未过期的积分批次（`tb_credit_batches`）
    - 团队席位积分：只统计当前被分配且订阅期未过期的席位积分
  - 汇总字段口径：`used = total - remaining`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "serverTime": "2026-03-19T10:00:00Z",
        "includeTeamSeat": true,
        "list": [
          {
            "type": "DAILY_CHECKIN",
            "title": "每日签到积分",
            "total": 400,
            "used": 120,
            "remaining": 280,
            "buckets": [
              {
                "expireAt": "2026-03-19T23:59:59+08:00",
                "total": 200,
                "used": 0,
                "remaining": 200,
                "sourceCode": "daily_checkin"
              }
            ]
          },
          {
            "type": "TEAM_SEAT",
            "title": "团队席位积分",
            "total": 50000,
            "used": 2000,
            "remaining": 48000,
            "buckets": [
              {
                "expireAt": "2026-04-01T00:00:00+08:00",
                "total": 50000,
                "used": 2000,
                "remaining": 48000,
                "teamId": 100,
                "periodId": 200
              }
            ]
          }
        ]
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 3.1 查询可用支付渠道（按商品币种过滤）

- **URL**: `/api/v1/paymentChannels`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Params**:
  - `itemType`: `plan` / `wrangler_plan` / `pack` / `team_plan` / `team_seat_expand`
  - `itemId`: 商品 ID
  - `planPeriod`: 可选，仅 `itemType=plan` 时用于按周期切换到目标套餐
  - `teamId`: 必填，仅 `itemType=team_plan` / `team_seat_expand`
  - `seatDelta`: 必填，仅 `itemType=team_seat_expand`
  - `expandMode`: 必填，仅 `itemType=team_seat_expand`（`PERM` / `TEMP`）
- **说明**:
  - 服务端会基于商品快照里的 `currency` 返回该币种下“可用且已启用”的支付渠道列表（按配置排序）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        { "code": "wechatpay", "name": "微信支付" },
        { "code": "airwallex", "name": "Airwallex" }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `400` (参数不合法 / teamId 缺失等)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 4. 创建订单（幂等）

- **URL**: `/api/v1/orders`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "itemType": "wrangler_plan",
    "itemId": 8,
    "planPeriod": "MONTH",
    "payChannel": "wechatpay",
    "idempotencyKey": "wrangler-order-20260325-0001"
  }
  ```
  - 普通套餐下单示例：
  ```json
  {
    "itemType": "plan",
    "itemId": 1,
    "planPeriod": "MONTH",
    "payChannel": "wechatpay",
    "teamId": 0,
    "idempotencyKey": "3d3cfcc3e0d942c7a7c726ad9b1de2aa"
  }
  ```
  - 团队套餐下单示例：
  ```json
  {
    "itemType": "team_plan",
    "itemId": 1,
    "teamId": 100,
    "payChannel": "wechatpay",
    "idempotencyKey": "idem-team-20260317-0001"
  }
  ```
  - 团队席位扩容下单示例：
  ```json
  {
    "itemType": "team_seat_expand",
    "itemId": 1,
    "teamId": 100,
    "seatDelta": 3,
    "expandMode": "TEMP",
    "payChannel": "wechatpay",
    "idempotencyKey": "idem-team-seat-20260317-0001"
  }
  ```
  - `itemType`: `plan`（个人套餐）/ `wrangler_plan`（牧马人套餐）/ `pack`（积分加量包）/ `team_plan`（团队套餐）/ `team_seat_expand`（团队席位扩容）
  - `planPeriod`: 当 `itemType=plan` 或 `itemType=wrangler_plan` 时生效，可选：`MONTH` / `HALF_YEAR` / `YEAR`
    - 不传：按 `itemId` 对应套餐本身的 `planPeriod` 下单
    - 传且与 `itemId` 的 `planPeriod` 不同：服务端会按 `itemId` 对应套餐的 `code` + 目标 `planPeriod` 自动切换到对应周期的套餐下单
  - `teamId`: 仅当 `itemType=team_plan` 时必填，表示团队 ID（`/api/v1/teams` 创建后返回的 ID）
  - `seatDelta`: 仅当 `itemType=team_seat_expand` 时必填，表示新增席位数（正整数）
  - `expandMode`: 仅当 `itemType=team_seat_expand` 时必填，可选：`PERM`（永久扩容）/ `TEMP`（临时扩容）
    - 方案 5.2-B：当 `expandMode=TEMP` 的订单在支付成功回调时发现“目标订阅期已过期”，服务端会自动按 `PERM` 方式入账（永久扩容）
  - `payChannel`: 用户选择的支付渠道编码（例如 `wechatpay` / `airwallex`），建议先通过 `GET /api/v1/paymentChannels` 查询后选择
  - `idempotencyKey`: 客户端生成的幂等键，用于重试不重复下单（建议 UUID/随机串）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 1,
        "order_no": "OPL260305034500123A1B2C3D4E5F67",
        "user_id": 1,
        "item_type": "plan",
        "item_id": 1,
        "title": "基础月卡",
        "currency": "CNY",
        "amount_cent": 1990,
        "status": "CREATED",
        "pay_channel": "wechatpay",
        "idempotency_key": "3d3cfcc3e0d942c7a7c726ad9b1de2aa",
        "expires_at": "2026-03-05T12:00:00+08:00",
        "paid_at": null,
        "created_at": "2026-03-05T11:45:00+08:00",
        "updated_at": "2026-03-05T11:45:00+08:00",
        "titleEn": "Basic Monthly",
        "subscriptionPeriodMonths": 1,
        "payment": {
          "channel": "wechatpay",
          "codeUrl": "weixin://wxpay/bizpayurl?pr=xxxxxx"
        }
      }
    }
    ```
- **Notes**:
  - `order_no` 采用固定 32 位格式：`O` + 2 位业务类型码 + 15 位 UTC 时间（`yyMMddHHmmssSSS`）+ 14 位随机大写十六进制尾码
  - `subscriptionPeriodMonths`：`plan` / `wrangler_plan` 按 `planPeriod/durationDays` 折算；`pack` 按 `validDays` 折算；`team_plan` 按团队套餐的 `planPeriod/durationDays` 折算
  - 创建订单响应包含 `payment` 支付入口信息：
    - `channel=wechatpay`：返回 `codeUrl`
    - `channel=airwallex`：返回 `paymentIntentId` 与 `clientSecret`
  - 兼容旧流程：仍可调用 `POST /api/v1/orders/:orderNo/pay` 获取同结构的支付入口信息
- **Error Response**:
  - **Code**: `400` (请求体不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500`
    - 创建套餐订单失败（套餐不存在或未上架 / 周期不合法等）
    - 创建加量包订单失败（加量包不存在或未上架 / 用户无有效订阅 / 加量包不在套餐允许范围内等）
    - 创建团队套餐订单失败（团队不存在/无权限 / 团队套餐不存在或未上架 / 套餐周期不合法等）

### 5. 查询订单列表

- **URL**: `/api/v1/orders`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Params**:
  - `page`: 页码（默认 `1`）
  - `pageSize`: 每页条数（默认 `10`，最大 `200`）
  - `status`: 订单状态筛选（可选）。支持单值或逗号分隔多值，例如：`PAID`、`REFUNDED` 或 `CREATED,PAYING`
  - `itemType`: 商品类型筛选（可选）。支持单值或逗号分隔多值，例如：`plan` 或 `plan,wrangler_plan,pack,team_plan,team_seat_expand`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "list": [
          {
            "id": 1,
            "order_no": "OPL260305034500123A1B2C3D4E5F67",
            "item_type": "plan",
            "item_id": 1,
            "title": "基础月卡",
            "item_snapshot_json": "{\"itemType\":\"plan\",\"itemId\":1,\"title\":\"基础月卡\",\"currency\":\"CNY\",\"amountCent\":1990,\"grantPoints\":100000,\"durationDays\":30,\"planPeriod\":\"MONTH\",\"validDays\":0,\"modelIds\":[\"qwen-long\"]}",
            "currency": "CNY",
            "amount_cent": 1990,
            "status": "PAID",
            "expires_at": "2026-03-05T12:00:00+08:00",
            "paid_at": "2026-03-05T11:46:12+08:00",
            "created_at": "2026-03-05T11:45:00+08:00",
            "updated_at": "2026-03-05T11:46:12+08:00",
            "pay_channel": "wechat",
            "pay_status": "SUCCESS",
            "pay_code_url": null,
            "invoice_eligible": true
          }
        ],
        "total": 1
      }
    }
    ```
  - `invoice_eligible`（`boolean`）：当前是否允许为该订单提交开票申请。为 `true` 当且仅当：订单状态为 `PAID`；不存在进行中的退款（退款状态为 `CREATED` / `PROCESSING` / `SUCCESS`）；且不存在处于 `PENDING` / `PROCESSING` / `COMPLETED` 的开票申请（若仅有 `REJECTED` 或 `CANCELLED` 的申请，或尚未申请过，则为 `true`）。
  - 当订单完成全额退款后，订单主状态会更新为 `REFUNDED`
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 6. 查询订单

- **URL**: `/api/v1/orders/:orderNo`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 1,
        "order_no": "OPL260305034500123A1B2C3D4E5F67",
        "user_id": 1,
        "item_type": "plan",
        "item_id": 1,
        "title": "基础月卡",
        "item_snapshot_json": "{\"itemType\":\"plan\",\"itemId\":1,\"title\":\"基础月卡\",\"currency\":\"CNY\",\"amountCent\":1990,\"grantPoints\":100000,\"durationDays\":30,\"planPeriod\":\"MONTH\",\"validDays\":0,\"modelIds\":[\"qwen-long\"]}",
        "currency": "CNY",
        "amount_cent": 1990,
        "status": "PAID",
        "idempotency_key": "3d3cfcc3e0d942c7a7c726ad9b1de2aa",
        "client_ip": "127.0.0.1",
        "expires_at": "2026-03-05T12:00:00+08:00",
        "paid_at": "2026-03-05T11:46:12+08:00",
        "created_at": "2026-03-05T11:45:00+08:00",
        "updated_at": "2026-03-05T11:46:12+08:00"
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败或订单不存在)

### 6.1 通过订单编号查询订单信息

- **URL**: `/api/v1/orders/byOrderNo`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Params**:
  - `orderNo`: 订单编号（必填）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 1,
        "order_no": "OPL260305034500123A1B2C3D4E5F67",
        "user_id": 1,
        "item_type": "plan",
        "item_id": 1,
        "title": "基础月卡",
        "item_snapshot_json": "{\"itemType\":\"plan\",\"itemId\":1,\"title\":\"基础月卡\",\"currency\":\"CNY\",\"amountCent\":1990,\"grantPoints\":100000,\"durationDays\":30,\"planPeriod\":\"MONTH\",\"validDays\":0,\"modelIds\":[\"qwen-long\"]}",
        "currency": "CNY",
        "amount_cent": 1990,
        "status": "CREATED",
        "idempotency_key": "3d3cfcc3e0d942c7a7c726ad9b1de2aa",
        "client_ip": "127.0.0.1",
        "expires_at": "2026-03-05T12:00:00+08:00",
        "paid_at": null,
        "created_at": "2026-03-05T11:45:00+08:00",
        "updated_at": "2026-03-05T11:45:00+08:00",
        "subscriptionPeriodMonths": 1,
        "payment": {
          "channel": "wechatpay",
          "codeUrl": "weixin://wxpay/bizpayurl?pr=xxxxxx"
        }
      }
    }
    ```
- **Notes**:
  - `subscriptionPeriodMonths`：`plan` / `wrangler_plan` 按 `planPeriod/durationDays` 折算；`pack` 按 `validDays` 折算；`team_plan` 按团队套餐的 `planPeriod/durationDays` 折算
  - 当订单未支付且未过期（通常 `status=CREATED/PAYING` 且 `now < expires_at`）时，响应会尽量包含 `payment` 支付入口信息，结构与 `POST /api/v1/orders/:orderNo/pay` 相同：
    - `channel=wechatpay`：返回 `codeUrl`
    - `channel=airwallex`：返回 `paymentIntentId` 与 `clientSecret`
- **Error Response**:
  - **Code**: `400` (orderNo 缺失或不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败或订单不存在)

### 6.2 查询订单退款预检结果

- **URL**: `/api/v1/orders/:orderNo/refundPreview`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 仅允许查询“当前登录用户自己的订单”
  - 该接口仅做退款资格预检，不会真正发起退款
  - 当前支持的退款订单类型：`plan`、`pack`
  - 当前支持的退款渠道：`wechatpay`、`airwallex`
  - 若已存在状态为 `CREATED` / `PROCESSING` / `SUCCESS` 的退款单，则 `canRefund=false`
  - 若订单发放的积分已被消耗，则 `canRefund=false`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "orderNo": "OPL260305034500123A1B2C3D4E5F67",
        "itemType": "plan",
        "channel": "wechatpay",
        "currency": "CNY",
        "refundAmountCent": 1990,
        "totalAmountCent": 1990,
        "grantPoints": 100000,
        "remainingPoints": 100000,
        "usedPoints": 0,
        "canRefund": true,
        "reasonCode": "",
        "reason": "",
        "existingRefundNo": "",
        "existingRefundStatus": ""
      }
    }
    ```
- **字段说明**:
  - `grantPoints`: 该订单原始发放积分数
  - `remainingPoints`: 当前仍可回收的剩余积分
  - `usedPoints`: 已使用积分；大于 `0` 时通常不可退款
  - `canRefund`: 是否允许继续调用退款接口
  - `reasonCode`: 不可退款时的机器可读原因码
  - `existingRefundNo` / `existingRefundStatus`: 当已存在退款单时返回
- **常见 `reasonCode`**:
  - `order_not_paid`: 订单未支付
  - `channel_unsupported`: 支付渠道暂不支持退款
  - `refund_exists`: 已存在退款单
  - `item_type_unsupported`: 商品类型暂不支持退款
  - `grant_missing`: 未找到该订单的发放记录
  - `credits_used`: 发放积分已被使用
  - `subscription_missing`: 未找到订阅记录
  - `subscription_changed`: 订阅状态已变化
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `404` (订单不存在，或不属于当前登录用户)
  - **Code**: `500` (查询失败)

### 6.3 发起订单退款

- **URL**: `/api/v1/orders/:orderNo/refund`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **说明**:
  - 仅允许对“当前登录用户自己的订单”发起退款
  - 服务端会先执行与 `refundPreview` 相同的资格校验，通过后创建退款单并调用原支付渠道退款
  - 当前仅支持全额退款
  - 退款审计信息会写入 `tb_refunds`、`tb_refund_events`
  - 当支付渠道已在外部后台完成全额退款、再次发起退款时，若渠道返回“订单已全额退款”，服务端会将其视为成功退款并继续执行本地权益回收与状态对齐
- **Request Body**:
  ```json
  {
    "reason": "用户申请退款"
  }
  ```
- **请求字段说明**:
  - `reason`: 退款原因（可选）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "refundNo": "RPL260305114612123A1B2C3D4E5F67",
        "status": "PROCESSING"
      }
    }
    ```
- **字段说明**:
  - `refundNo`: 系统退款单号
  - `status`: 当前退款状态，常见值为 `PROCESSING` / `SUCCESS` / `FAILED`
- **Error Response**:
  - **Code**: `400` (请求体不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `404` (订单不存在，或不属于当前登录用户)
  - **Code**: `409` (订单当前不可退款，或支付渠道不支持退款)
  - **Code**: `500` (发起退款失败)

### 7. 发起微信支付（Native 扫码）

- **URL**: `/api/v1/orders/:orderNo/pay/wechat`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "codeUrl": "weixin://wxpay/bizpayurl?pr=xxxxxx"
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (发起支付失败 / 订单已过期 / 订单已支付 / 支付未启用)

### 7.1 统一发起支付（兼容旧流程）

- **URL**: `/api/v1/orders/:orderNo/pay`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **说明**:
  - 服务端根据订单 `pay_channel` 派发到对应支付渠道
  - 该接口用于兼容旧客户端/旧流程；新流程可直接使用 `POST /api/v1/orders` 响应中的 `payment`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "channel": "wechatpay",
        "codeUrl": "weixin://wxpay/bizpayurl?pr=xxxxxx"
      }
    }
    ```
    或：
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "channel": "airwallex",
        "paymentIntentId": "int_***",
        "clientSecret": "int_***_secret_***"
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (发起支付失败 / 订单已过期 / 订单已支付 / 支付未启用 / 渠道不匹配)

### 8. 微信支付回调（WeChat Pay v3 Notify）

- **URL**: `/api/v1/pay/wechat/notify`
- **Method**: `POST`
- **Headers**:
  - 微信支付 v3 回调签名头（如 `Wechatpay-Serial`、`Wechatpay-Signature`、`Wechatpay-Timestamp`、`Wechatpay-Nonce` 等）
- **Content-Type**: `application/json`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    { "code": "SUCCESS", "message": "OK" }
    ```
- **Error Response**:
  - **Code**: `400`
  - **Body**:
    ```json
    { "code": "FAIL", "message": "xxx" }
    ```
  - 说明：回调具备幂等性，微信可能重复推送，同一订单只会入账一次。

### 8.1 微信退款回调（WeChat Pay v3 Refund Notify）

- **URL**: `/api/v1/pay/wechat/refundNotify`
- **Method**: `POST`
- **Headers**:
  - 微信支付 v3 退款回调签名头（如 `Wechatpay-Serial`、`Wechatpay-Signature`、`Wechatpay-Timestamp`、`Wechatpay-Nonce` 等）
- **Content-Type**: `application/json`
- **说明**:
  - 该接口仅由微信支付服务器调用，客户端不直接调用
  - 服务端验签、解密后会更新退款单状态，并将原始回调落库到 `tb_refunds.notify_raw` 与 `tb_refund_events`
  - 当退款首次进入 `SUCCESS` 时，会执行一次权益回收，并将订单状态更新为 `REFUNDED`；重复回调不会重复回收
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    { "code": "SUCCESS", "message": "OK" }
    ```
- **Error Response**:
  - **Code**: `400`
  - **Body**:
    ```json
    { "code": "FAIL", "message": "xxx" }
    ```

### 8.2 Airwallex 支付/退款 Webhook

- **URL**: `/api/v1/pay/airwallex/notify`
- **Method**: `POST`
- **Headers**:
  - `x-timestamp`
  - `x-signature`
- **Content-Type**: `application/json`
- **说明**:
  - 该接口仅由 Airwallex 服务器调用，客户端不直接调用
  - 服务端会校验来源 IP、时间戳和签名
  - 已处理的支付事件：
    - `payment_intent.succeeded`
    - `payment_intent.succeeded.v1`
  - 已处理的退款事件：
    - `refund.received`
    - `refund.accepted`
    - `refund.settled`
    - `refund.failed`
  - 退款事件会更新 `tb_refunds` 与 `tb_refund_events`；当退款首次进入成功态时，会执行一次权益回收，并将订单状态更新为 `REFUNDED`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success"
    }
    ```
- **Error Response**:
  - **Code**: `400` (签名非法、时间戳非法、IP 不允许、事件数据非法)
  - **Code**: `500` (服务端处理失败)

### 9. 提交开票申请

- **URL**: `/api/v1/invoiceRequests`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **说明**:
  - 仅允许为“当前登录用户自己的已支付订单”提交开票申请
  - 若订单已退款/退款中，不允许提交
  - 若该订单已存在状态为 `PENDING` / `PROCESSING` / `COMPLETED` 的开票申请，不允许再次提交（`409`）
  - 若该订单仅有 `REJECTED` 或 `CANCELLED` 的申请，允许再次提交：服务端会复用同一条申请记录，更新内容并重新置为 `PENDING`（申请单号 `request_no` 会更新）
  - 单位抬头建议先调用 `GET /api/v1/companySearch/suggestions` 做企业名称联想，再把选中的 `companyName/taxpayerNo` 回填后提交
- **Request Body**（个人抬头示例）:
  ```json
  {
    "orderNo": "OPL260305034500123A1B2C3D4E5F67",
    "invoiceTitleType": "PERSONAL",
    "invoiceKind": "ELECTRONIC_COMMON",
    "personalName": "张三",
    "receiverEmail": "user@example.com",
    "remark": "请尽快发送"
  }
  ```
- **Request Body**（单位抬头示例）:
  ```json
  {
    "orderNo": "OPL260305034500123A1B2C3D4E5F67",
    "invoiceTitleType": "COMPANY",
    "invoiceKind": "ELECTRONIC_COMMON",
    "companyName": "杭州示例科技有限公司",
    "taxpayerNo": "91330100MA12345678",
    "receiverEmail": "finance@example.com",
    "remark": "用于报销"
  }
  ```
- **请求字段说明**:
  - `orderNo`: 订单号（必填）
  - `invoiceTitleType`: 抬头类型（必填），支持 `PERSONAL` / `COMPANY`
  - `invoiceKind`: 发票类型（必填），当前支持 `ELECTRONIC_COMMON` / `PAPER_COMMON` / `VAT_SPECIAL`
  - `personalName`: 个人抬头时的开票姓名（**个人抬头必填其一**：与 `titleName` 二选一即可；若同时传，优先使用本字段）
  - `titleName`: 个人抬头时亦可作为开票姓名传入（与 `personalName` 二选一）；单位抬头时由服务端写入为企业名称，客户端无需传
  - `companyName`: 企业名称（单位抬头必填）
  - `taxpayerNo`: 纳税人识别号/统一社会信用代码（单位抬头必填）
  - `receiverEmail`: 接收邮箱（必填）
  - `remark`: 发票备注（可选）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 1,
        "request_no": "IV260401102030123A1B2C3D4E5F67",
        "order_no": "OPL260305034500123A1B2C3D4E5F67",
        "invoice_title_type": "COMPANY",
        "invoice_kind": "ELECTRONIC_COMMON",
        "title_name": "杭州示例科技有限公司",
        "company_name": "杭州示例科技有限公司",
        "taxpayer_no": "91330100MA12345678",
        "receiver_email": "finance@example.com",
        "remark": "用于报销",
        "status": "PENDING",
        "created_at": "2026-04-01T10:20:30+08:00"
      }
    }
    ```
- **Error Response**:
  - **Code**: `400`
    - `invoice order not found`
    - `invoice order is not paid`
    - `invoice order is refunded or refunding`
    - `invalid invoice title type`
    - `invalid invoice kind`
    - `invalid receiver email`
    - `company name is required`
    - `taxpayer number is required`
    - 个人抬头未提供开票姓名（`personalName` 与 `titleName` 均为空）
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `409` (`invoice request already exists`：已有未驳回且未结束的有效申请，见上文说明)
  - **Code**: `500` (提交失败)
### 10. 查询我的开票申请记录

- **URL**: `/api/v1/invoiceRequests`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: 页码（默认 `1`）
  - `pageSize`: 每页条数（默认 `10`，最大 `200`）
  - `orderNo`: 订单号筛选（可选）
  - `status`: 状态筛选（可选），支持 `PENDING` / `PROCESSING` / `COMPLETED` / `REJECTED` / `CANCELLED`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "list": [
          {
            "id": 1,
            "request_no": "IV260401102030123A1B2C3D4E5F67",
            "order_no": "OPL260305034500123A1B2C3D4E5F67",
            "order_title": "基础月卡",
            "order_amount_cent": 1990,
            "currency": "CNY",
            "invoice_title_type": "COMPANY",
            "invoice_kind": "ELECTRONIC_COMMON",
            "title_name": "杭州示例科技有限公司",
            "company_name": "杭州示例科技有限公司",
            "taxpayer_no": "91330100MA12345678",
            "receiver_email": "finance@example.com",
            "remark": "用于报销",
            "status": "PROCESSING",
            "rejection_reason": "",
            "process_remark": "运营已开始处理",
            "created_at": "2026-04-01T10:20:30+08:00",
            "processed_at": "2026-04-01T11:00:00+08:00",
            "completed_at": null,
            "sent_email_at": null
          }
        ],
        "total": 1
      }
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 11. 企业名称联想搜索

- **URL**: `/api/v1/companySearch/suggestions`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Query Parameters**:
  - `keyword`: 企业名称关键字（建议至少 2 个字）
  - `limit`: 返回条数（可选，默认 `10`，最大 `20`）
- **说明**:
  - 当前版本先返回本系统历史单位开票记录中的企业名称建议，作为 fallback 模式
  - 后续可在不改前端契约的前提下接入第三方企业信息服务商
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "companyId": "91330100MA12345678",
          "companyName": "杭州示例科技有限公司",
          "taxpayerNo": "91330100MA12345678",
          "displayText": "杭州示例科技有限公司 (91330100MA12345678)",
          "source": "local_history"
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

## 团队（C 端）

### 0. 调用流程（创建团队 + 购买团队套餐 + 自动入席）

1. 用户先完成登录，拿到 `token`
2. 团队 owner 创建团队：`POST /api/v1/teams`
3. 团队 owner 添加成员：`POST /api/v1/teams/:teamId/members`
4. 获取可购买团队套餐列表：`GET /api/v1/teamPlans`
5. 查询可用支付渠道：`GET /api/v1/paymentChannels?itemType=team_plan&itemId=...&teamId=...`
6. 用户选择 `payChannel` 后创建订单：`POST /api/v1/orders`（`itemType=team_plan`，携带 `teamId`；响应会直接包含 `payment` 支付入口信息）
7. （可选，兼容旧流程）统一发起支付：`POST /api/v1/orders/:orderNo/pay`
8. 支付成功后：
   - 服务端自动创建/续费订阅期并初始化席位
   - 服务端自动为团队成员分配空闲席位（成员加入时优先自动入席；若成员先加入后购套餐/扩容，也会自动补齐入席）
   - 管理员查询席位：`GET /api/v1/teams/:teamId/seats`
   - （可选）管理员手动调整席位：`POST /api/v1/teams/:teamId/seats/:seatNo/assign` / `POST /api/v1/teams/:teamId/seats/:seatNo/unassign`

### 1. 查询我加入的团队列表

- **URL**: `/api/v1/teams`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "teamId": 1,
          "name": "Team A",
          "role": "OWNER",
          "ownerUserId": 123,
          "ownerUser": { "userId": 123, "nickname": "alice", "avatar": "https://cdn.xxx/a.png" }
        },
        {
          "teamId": 2,
          "name": "Team B",
          "role": "MEMBER",
          "ownerUserId": 456,
          "ownerUser": { "userId": 456, "nickname": "bob", "avatar": "https://cdn.xxx/b.png" }
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败)

### 2. 创建团队

- **URL**: `/api/v1/teams`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  { "name": "Team A" }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": {
        "id": 1,
        "name": "Team A",
        "ownerUserId": 123,
        "createdAt": "2026-03-12T08:00:00Z",
        "updatedAt": "2026-03-12T08:00:00Z",
        "deletedAt": null
      }
    }
    ```
- **Notes**:
  - 团队相关接口字段使用 `camelCase`（如 `ownerUserId` / `createdAt`）。
- **Error Response**:
  - **Code**: `400` (请求体不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (创建失败)

### 3. 查询团队成员

- **URL**: `/api/v1/teams/:teamId/members`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        {
          "id": 1,
          "teamId": 1,
          "userId": 123,
          "user": { "userId": 123, "nickname": "alice", "avatar": "https://cdn.xxx/a.png" },
          "role": "OWNER",
          "status": "ACTIVE",
          "joinedAt": "2026-03-12T08:00:00Z",
          "createdAt": "2026-03-12T08:00:00Z",
          "updatedAt": "2026-03-12T08:00:00Z"
        },
        {
          "id": 2,
          "teamId": 1,
          "userId": 456,
          "user": { "userId": 456, "nickname": "bob", "avatar": "https://cdn.xxx/b.png" },
          "role": "MEMBER",
          "status": "ACTIVE",
          "joinedAt": "2026-03-12T08:00:00Z",
          "createdAt": "2026-03-12T08:00:00Z",
          "updatedAt": "2026-03-12T08:00:00Z"
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `400` (teamId 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败/无权限)

### 4. 添加团队成员

- **URL**: `/api/v1/teams/:teamId/members`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  { "userId": 456, "role": "MEMBER" }
  ```
  - `role` 可选：`ADMIN` / `MEMBER`（不传默认 `MEMBER`）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    { "code": 200, "msg": "Success" }
    ```
- **Notes**:
  - 若团队存在“当前有效订阅期”且有空闲席位，服务端会在成员加入成功后自动分配席位（无需额外调用席位分配接口）
  - 若团队存在“当前有效订阅期”但没有空闲席位，接口会返回错误（不允许“超席位”加入）
  - 若团队当前没有有效订阅期（未购团队套餐），成员仍可加入；待后续购套餐/扩容后会自动补齐入席（按席位数量为止）
- **Error Response**:
  - **Code**: `400` (请求体不合法/teamId 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (添加失败/无权限/role 不合法)

### 5. 移除团队成员

- **URL**: `/api/v1/teams/:teamId/members/:userId`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    { "code": 200, "msg": "Success" }
    ```
- **Error Response**:
  - **Code**: `400` (teamId/userId 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (移除失败/无权限/不能移除 owner)

### 6. 查询团队当前席位

- **URL**: `/api/v1/teams/:teamId/seats`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "Success",
      "data": [
        { "seatNo": 1, "seatId": 101, "assignedUserId": 123, "assignmentId": 10001 },
        { "seatNo": 2, "seatId": 102, "assignedUserId": null, "assignmentId": null }
      ]
    }
    ```
- **Error Response**:
  - **Code**: `400` (teamId 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (查询失败/无权限/无有效订阅期)

### 7. 分配席位给成员

- **URL**: `/api/v1/teams/:teamId/seats/:seatNo/assign`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  { "userId": 456 }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    { "code": 200, "msg": "Success" }
    ```
- **Error Response**:
  - **Code**: `400` (teamId/seatNo 不合法/请求体不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (分配失败/无权限/用户非团队成员/无有效订阅期)

### 8. 解绑席位

- **URL**: `/api/v1/teams/:teamId/seats/:seatNo/unassign`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    { "code": 200, "msg": "Success" }
    ```
- **Error Response**:
  - **Code**: `400` (teamId/seatNo 不合法)
  - **Code**: `401` (未登录或 token 无效)
  - **Code**: `500` (解绑失败/无权限/无有效订阅期)
## 其他

### 1. 健康检查

- **URL**: `/health`
- **Method**: `GET`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 0,
      "msg": "OK",
      "data": {
        "status": "healthy"
      }
    }
    ```

## C 端用户反馈与 OSS 上传

以下接口均需 **`Authorization: Bearer <token>`**（C 端用户 JWT）。上传接口成功后在 `data` 中返回 `oss_id`，提交反馈时在 JSON 中引用该字段。

### 1. 上传反馈截图

- **URL**: `/api/v1/uploads/feedback/screenshot`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form 字段**:
  - `file`：图片文件（`image/jpeg`、`image/png`、`image/webp`、`image/gif`），单文件最大 **10MiB**
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "oss_id": 10001 }
    }
    ```
- **Error Response**（节选）:
  - **Code**: `400`（`error.feedback.file_required` / `error.feedback.file_too_large` / `error.feedback.file_type_not_allowed`）
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `500`（OSS 或数据库失败）

### 2. 上传反馈日志压缩包

- **URL**: `/api/v1/uploads/feedback/log`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form 字段**:
  - `file`：**ZIP** 压缩包，单文件最大 **50MiB**（服务端会校验为合法 zip）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "oss_id": 10002 }
    }
    ```
- **Error Response**（节选）: 同截图上传

### 3. 提交用户反馈

- **URL**: `/api/v1/feedbacks`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "content": "问题描述（必填，非空，最大约 2 万字符）",
    "contactInfo": "可选，手机/邮箱/微信等联系方式，最长 256 字符",
    "screenshotOssIds": [10001, 10003],
    "logOssId": 10002,
    "systemModel": "Windows 11 专业版",
    "cpuModel": "Intel Core i7-1360P",
    "gpuModel": "NVIDIA RTX 4060",
    "appVersion": "1.2.3",
    "platform": "win32",
    "clientId": "可选，客户端实例 ID"
  }
  ```
- **字段说明**:
  - `contactInfo`：可选，联系方式（字符串，最长 256 字符）；未填或仅空白时存为空字符串。
  - `screenshotOssIds`：可选，**最多 3 个**，须为先前截图上传返回的 `oss_id`，且属于当前用户、用途为反馈截图；不可重复。
  - `logOssId`：可选，须为先前日志上传返回的 `oss_id`，且属于当前用户、用途为反馈日志。
  - `appVersion`：**必填**（应用版本号）；其余硬件与平台字段可选，由客户端自行采集。
- **企微通知**：反馈落库成功后，若服务端 `wecom.url` 已配置，将异步向企业微信群机器人推送文本（含反馈正文、用户有效渠道、`appVersion` 作为 AIPC 版本）；未配置 webhook 时静默跳过。
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "id": 5001 }
    }
    ```
- **Error Response**（节选）:
  - **Code**: `400`（`error.invalid_request_body`、`error.feedback.content_invalid`、`error.feedback.contact_invalid`、`error.feedback.screenshot_limit`、`error.feedback.duplicate_screenshot_oss`、`error.feedback.oss_invalid`）
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `500`（服务器内部错误）

## Flowy 论坛站内信（C 端）

以下接口均需 **`Authorization: Bearer <token>`**（**仅 C 端用户 JWT**；不支持 `flowy-` 用户 API 密钥）。数据来自论坛侧经主站投递接口写入的 `tb_forum_inbox_messages`；列表按 **`occurredAt` 倒序**。论坛服务端对接投递接口见 **`docs/forum-inbox-integration.md`**。

### 1. 站内信列表

- **URL**: `/api/v1/forum/inbox/messages`
- **Method**: `GET`
- **Query**:
  - `page`：页码，默认 `1`
  - `pageSize`：每页条数，默认 `20`，最大 `100`
  - `onlyUnread`：传 `true` 时仅返回未读（`read_at` 为空）
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "list": [
          {
            "id": 12345,
            "title": "标题",
            "body": "正文",
            "linkUrl": "https://forum.example.com/t/1",
            "occurredAt": "2026-05-06T12:00:00+08:00",
            "read": false,
            "readAt": null,
            "forumMessageId": "forum-msg-abc",
            "createdAt": "2026-05-06T12:00:01+08:00"
          }
        ],
        "total": 100,
        "page": 1,
        "pageSize": 20
      }
    }
    ```
- **字段说明**（`list` 单项）:
  - `read`：`true` 表示已读（`read_at` 非空）。
  - `readAt`：首次标记已读时间；未读为 `null`。
  - `forumMessageId`：若投递时带论坛幂等 ID 则有值，否则省略。
- **Error Response**（节选）:
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `500`（数据库错误）

### 2. 未读条数

- **URL**: `/api/v1/forum/inbox/unreadCount`
- **Method**: `GET`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "unreadCount": 3 }
    }
    ```
- **Error Response**（节选）:
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `500`（数据库错误）

### 3. 单条标记已读

- **URL**: `/api/v1/forum/inbox/messages/:id/read`
- **Method**: `POST`
- **Path**:
  - `id`：站内信主键（数字）
- **说明**:
  - 仅允许操作**当前登录用户**名下的记录。
  - 已读幂等：若该条已是已读，仍返回成功（`200`，`data` 省略）。
- **Success Response**:
  - **Code**: `200`
  - **Body**: 与项目惯例一致，`code` 为 `200`，**无 `data` 字段**（`OKNoData`）。
- **Error Response**（节选）:
  - **Code**: `400`（`error.invalid_param`，`id` 非法）
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `404`（`error.forum.message_not_found`：不存在或不属于当前用户）
  - **Code**: `500`（数据库错误）

### 4. 全部标记已读

- **URL**: `/api/v1/forum/inbox/readAll`
- **Method**: `POST`
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": { "updated": 5 }
    }
    ```
  - `updated`：本次将 `read_at` 从空更新为非空的行数（若无未读则为 `0`）。
- **Error Response**（节选）:
  - **Code**: `401`（未登录或 token 无效）
  - **Code**: `500`（数据库错误）

## Flowy 论坛集成（服务端）

以下接口供 **Flowy 论坛服务端** 调用，**不需要 C 端用户 JWT**。用户以 **`email` + 可选 `channel`** 与主站 `tb_users` 对齐（规则同站内信投递，见 **`docs/forum-inbox-integration.md` §2）。

### 1. 首次发帖奖励积分

论坛侧在用户**首次发帖**时调用；主站按用户幂等发放积分，**每个用户仅成功赠送一次**（依赖 `tb_credit_ledger` 唯一约束 `(user_id, reason, ref_type, ref_id)`）。

- **URL**: `/api/v1/integration/forum/first-post/reward`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **鉴权**: 无（不要求 `Authorization`）
- **配置**: `forum.first_post_reward_points`（`int64`，为 `0` 时功能关闭，接口返回 **503**）

#### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 用户邮箱；主站会 trim 并转小写后匹配 |
| `channel` | string | 否 | 与主站用户 `channel` 一致；省略时使用 `forum.default_user_channel`（默认 `flowy`） |

```json
{
  "email": "user@example.com",
  "channel": "flowy"
}
```

#### 成功响应（HTTP 200）

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "grantedPoints": 200,
    "balance": 520,
    "duplicate": false
  }
}
```

| 字段 | 说明 |
|------|------|
| `grantedPoints` | **本次请求**实际发放的积分；若用户已领取过则为 `0` |
| `balance` | 发放后用户当前可用积分余额（按批次快照计算） |
| `duplicate` | `true` 表示该用户此前已领取首次发帖奖励，本次未重复发放 |

#### 常见错误

| HTTP | errorKey | 说明 |
|------|-----------|------|
| 400 | `error.invalid_request_body` | JSON 无法绑定（如 `email` 缺失或格式非法） |
| 404 | `error.forum.user_not_found` | 该邮箱 + 渠道下无主站用户 |
| 503 | `error.forum.first_post_reward_disabled` | `forum.first_post_reward_points` 未配置或为 `0` |
| 500 | `error.internal` | 服务器内部错误 |

#### 调用示例（curl）

```bash
curl -sS -X POST 'https://<API_HOST>/api/v1/integration/forum/first-post/reward' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "channel": "flowy"
  }'
```

#### 幂等与重试

- 论坛侧应在确认「首次发帖」后再调用；主站以用户维度去重，重复调用安全。
- 并发重复请求时，仅一笔积分入账成功，其余返回 `duplicate: true`、`grantedPoints: 0`。
- 积分流水 `reason` 为 `forum_first_post`，用户积分明细中展示为「论坛首次发帖奖励」。

## 运营统计与订单（Sys，需后台登录）

以下接口均需使用后台会话访问，对应路由前缀为 `/api/v1/sys`。

### 1. 运营看板统计

- **URL**: `/api/v1/sys/stats/dashboard`
- **Method**: `GET`
- **说明**:
  - 返回运营首页所需的聚合统计
  - `channelAnalytics` 中与支付金额相关的字段已区分“净额”和“毛额”
  - 净额口径会排除已成功全额退款的订单；毛额口径保留原始支付金额
- **关键字段说明**:
  - `channelAnalytics.totalPaidAmountCent`：全渠道净支付金额（分）
  - `channelAnalytics.totalPaidAmountGrossCent`：全渠道毛支付金额（分）
  - `channelAnalytics.items[].paidAmountCent`：该渠道净支付金额（分）
  - `channelAnalytics.items[].paidAmountGrossCent`：该渠道毛支付金额（分）
  - `channelAnalytics.items[].paidAmountShare`：该渠道净支付金额占比
  - `channelAnalytics.items[].paidAmountGrossShare`：该渠道毛支付金额占比
  - `clientAppUserCounts.aipc`：曾通过 AIPC 客户端登录的用户数（`tb_users.app_aipc = 1`）
  - `clientAppUserCounts.herdsman`：曾通过 Herdsman 客户端登录的用户数（`tb_users.app_herdsman = 1`）
  - `clientAppUserCounts.flowymes`：曾通过 FlowyMes 客户端登录的用户数（`tb_users.app_flowymes = 1`）
  - `userAnalytics.trend[].newAipcUsers`：当日首次通过 AIPC 客户端登录的新用户数（`app_aipc_at` 落在当日；登录未传 `app` 时默认 AIPC）
  - `userAnalytics.trend[].newHerdsmanUsers`：当日首次通过 Herdsman 客户端登录的新用户数（`app_herdsman_at` 落在当日）
  - `userAnalytics.trend[].newFlowyMesUsers`：当日首次通过 FlowyMes 客户端登录的新用户数（`app_flowymes_at` 落在当日；与 `clientAppUserCounts.flowymes` 标记口径一致）
  - `clientAppDeviceCounts.aipc`：由 AIPC 客户端上报的成功激活设备数（`tb_activate_device.client_app = 'aipc'`）
  - `clientAppDeviceCounts.herdsman`：由 Herdsman 客户端上报的成功激活设备数（`tb_activate_device.client_app = 'herdsman'`）
  - `clientAppDeviceCounts.flowymes`：由 FlowyMes 客户端上报的成功激活设备数（`tb_activate_device.client_app = 'flowymes'`）

### 2. 复购用户列表

- **URL**: `/api/v1/sys/orders/repurchase`
- **Method**: `GET`
- **Query Params**:
  - `page`：页码（默认 `1`）
  - `pageSize`：每页条数（默认 `20`，最大 `100`）
  - `keyword`：按邮箱 / 昵称模糊搜索（可选）
- **说明**:
  - 复购用户定义为“有效支付订单数 >= 2”的 C 端用户
  - 有效支付订单口径会排除：
    - 已成功全额退款的订单
    - 当日支付后又全额退款的订单

### 3. 复购用户导出

- **URL**: `/api/v1/sys/orders/repurchase/export`
- **Method**: `GET`
- **Query Params**:
  - `keyword`：按邮箱 / 昵称模糊搜索（可选）
- **说明**:
  - 导出范围与复购用户列表保持同一统计口径
  - 导出的订单明细仅包含“有效支付订单”，不会包含当日支付后又全额退款的订单

---

## 会议纪要 LLM（C 端，需登录）

以下接口均需请求头 `Authorization: Bearer <token>`，与现有 C 端接口一致。模型调用与 `/v1/chat/completions` 共用 **model_proxy**，`meeting_summary.model` 应填写与对话接口 **`model` 字段相同**的字符串（例如 `Pro/MiniMaxAI/MiniMax-M2.5` 走自动选路；若需按库表 `tb_model.name` 精确指定渠道，可写 `flowy/<name>`）。积分扣减与 `tb_user_chat` 与对话一致。需 `meeting_summary.enabled=true` 且能解析出模型名。

**语言 `language`**：传 `zh` 或 `en`（也兼容 `zh-CN`、`en-US` 等），用于选择内置中/英提示词。

### 1. 会议主题与关键词总结（非流式）

一次请求 **并行** 三次非流式 LLM：分别用 `meeting_summary.topic`、`meeting_summary.keywords` 与 `meeting_summary.todos` 的 temperature / `max_tokens` 生成「会议主题」「会议关键词」与「待办事项列表」（待办提示词区分中/英，与内置 `meetingllm/prompts/todos.*.txt` 一致）。积分与 `tb_user_chat` 记 **三次** 调用；运营审计仍一条 `call_type=topic_keywords`（`messages_json` 内含三步：`topic`、`keywords`、`todos`）。需配置可解析的 `meeting_summary.model`（或旧版子任务 `model`），否则返回 `503`（`error.meeting_summary.not_configured`）。

**超时与网关**：受 `meeting_summary.http_timeout` 限制；若前置 Nginx/API 网关 **`proxy_read_timeout`（或等价）过短**，客户端可能 **504**，需调大。

- **URL**: `/api/v1/meeting/topicKeywords`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "asrText": "会议 ASR 转写全文",
    "userNotes": "用户笔记，可为空（仅用于主题子任务）",
    "language": "zh"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Body**:
    ```json
    {
      "code": 200,
      "msg": "操作成功",
      "data": {
        "topic": "不超过约二十字的会议主题纯文本",
        "keywords": ["关键词1", "关键词2"],
        "todoItems": [
          {
            "type": "todo",
            "title": "任务或行动描述",
            "assignee": "负责人，可为空",
            "reminderTime": "截止时间，可为空（建议 ISO 8601）",
            "priority": "high"
          }
        ]
      }
    }
    ```
  - **`todoItems`**：`type` 为 `todo`（一次性待办）或 `recurring`（周期性提醒）；`priority` 为 `high` / `medium` / `low` 之一或省略；无待办时为空数组 `[]`。
- **Error Response**（节选）:
  - **Code**: `400`（`error.meeting_summary.disabled`、`error.invalid_param`（language/asrText）、`error.meeting_summary.asr_too_long`、`error.meeting_summary.user_notes_too_long`）
  - **Code**: `402`（`error.insufficient_credit`，与对话接口一致）
  - **Code**: `429`（`error.rate_limited`）
  - **Code**: `503`（`error.meeting_summary.not_configured`：未配置模型名等）
  - **Code**: `502`（`error.meeting_summary.topic_parse_failed` / `error.meeting_summary.keywords_parse_failed` / `error.meeting_summary.todos_parse_failed`：对应子任务模型输出无法解析时）
  - **Code**: `500`（`error.internal`、`error.all_channel_models_failed`）

### 2. 会议纪要总结（流式 SSE）

- **URL**: `/api/v1/meeting/minutes/stream`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Accept**: `text/event-stream`（建议）
- **Request Body**:
  ```json
  {
    "participants": "参会人员",
    "meetingTime": "会议时间描述",
    "asrText": "会议 ASR 转写全文",
    "userNotes": "用户手写笔记，可为空",
    "language": "zh"
  }
  ```
- **Success Response**:
  - **Code**: `200`
  - **Content-Type**: `text/event-stream`
  - **Body**: OpenAI 兼容 SSE（`data: {...}` 行），与标准流式补全一致；客户端请使用 `fetch` + `ReadableStream` 解析（勿用仅支持 GET 的 `EventSource` 携带大 Body）。
- **Error Response**:
  - 若在建立流之前校验失败或未开始写入 SSE，返回 JSON 错误（同上，含 `error.meeting_summary.participants_too_long`、`error.meeting_summary.meeting_time_too_long` 等）。
  - 若已开始推送 SSE 后中断，连接关闭，无二次 JSON 包体。
