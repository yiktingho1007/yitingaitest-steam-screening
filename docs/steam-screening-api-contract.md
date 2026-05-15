# Steam 产品初筛工具接口契约

- 状态：Draft v0.1
- 最后更新：2026-05-14
- 适用范围：V1
- 文档目标：定义前后端之间的请求、响应、错误返回和降级规则，确保后端开发、前端联调、测试验收和 LLM 接入使用同一份接口约定

## 1. 接口设计原则

- 所有接口统一使用 `JSON`
- 字符编码统一为 `UTF-8`
- 所有响应都必须携带 `request_id`
- 所有关键业务错误必须返回结构化错误码
- 数值结果优先返回，再返回 LLM 解释
- 当 LLM 失败时，不应影响核心数值页面展示

## 2. 通用约定

### 2.1 请求头

| Header | 必填 | 说明 |
| --- | --- | --- |
| `Content-Type: application/json` | 是 | 统一 JSON 请求 |
| `Authorization` | 视部署而定 | 内部环境可接入统一鉴权 |
| `X-Request-Id` | 否 | 外部传入请求 ID，若未传则后端生成 |

### 2.2 响应顶层结构

成功响应统一采用：

```json
{
  "request_id": "scr_20260514_0001",
  "success": true,
  "data": {}
}
```

失败响应统一采用：

```json
{
  "request_id": "scr_20260514_0001",
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "未找到匹配的 Steam 产品",
    "retryable": false,
    "details": {}
  }
}
```

### 2.3 时间格式

- 所有时间统一使用 ISO 8601
- 示例：`2026-05-14T10:15:30+08:00`

### 2.4 字段命名

- 接口字段统一使用 `snake_case`
- 布尔值字段统一以 `is_`、`has_` 开头

## 3. 接口列表

V1 建议至少提供以下 3 个接口：

1. `POST /api/v1/steam/resolve`
2. `POST /api/v1/steam/screen`
3. `GET /api/v1/health`

## 4. 产品解析接口

## 4.1 `POST /api/v1/steam/resolve`

### 4.1.1 接口目标

将用户输入解析成一个或多个 Steam 产品候选，用于：

- 搜索联想
- 重名游戏 disambiguation
- 正式分析前的产品确认

### 4.1.2 请求体

```json
{
  "query": "Hades",
  "query_type": "auto",
  "locale": "zh-CN",
  "max_candidates": 5
}
```

### 4.1.3 请求字段定义

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `string` | 是 | 用户输入内容 |
| `query_type` | `string` | 否 | `auto/name/steam_url/app_id`，默认 `auto` |
| `locale` | `string` | 否 | 结果语言环境，默认 `zh-CN` |
| `max_candidates` | `number` | 否 | 最大候选数，默认 `5` |

### 4.1.4 成功响应示例

```json
{
  "request_id": "scr_20260514_0002",
  "success": true,
  "data": {
    "raw_query": "Hades",
    "query_type": "auto",
    "candidates": [
      {
        "app_id": 1145360,
        "name": "Hades",
        "steam_url": "https://store.steampowered.com/app/1145360/Hades/",
        "match_score": 98.6,
        "match_reason": "名称精确匹配"
      }
    ],
    "needs_user_confirmation": false
  }
}
```

### 4.1.5 业务规则

- 如果只命中一个高置信产品，`needs_user_confirmation=false`
- 如果命中多个重名或相近产品，返回候选列表并要求用户确认
- 如果完全无法命中，返回 `PRODUCT_NOT_FOUND`

## 5. 初筛分析接口

## 5.1 `POST /api/v1/steam/screen`

### 5.1.1 接口目标

输入一个 Steam 产品，返回：

- 目标产品结构化数据
- 竞品候选与最终两款竞品
- LLM 生成的受控总结
- 调试与降级信息

### 5.1.2 请求体

```json
{
  "query": "Hades",
  "query_type": "auto",
  "locale": "zh-CN",
  "currency": "CNY",
  "competitor_mode": "auto",
  "competitor_count": 2,
  "include_estimate_metrics": true,
  "include_review_samples": false,
  "include_competitor_candidates": true,
  "force_refresh": false
}
```

### 5.1.3 请求字段定义

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `string` | 是 | 用户输入内容 |
| `query_type` | `string` | 否 | `auto/name/steam_url/app_id` |
| `locale` | `string` | 否 | 输出语言环境，默认 `zh-CN` |
| `currency` | `string` | 否 | 展示币种，默认跟随区域配置 |
| `competitor_mode` | `string` | 否 | V1 固定 `auto` |
| `competitor_count` | `number` | 否 | V1 固定为 `2` |
| `include_estimate_metrics` | `boolean` | 否 | 是否返回第三方估算字段，默认 `false` |
| `include_review_samples` | `boolean` | 否 | 是否返回评论样本 |
| `include_competitor_candidates` | `boolean` | 否 | 是否返回竞品候选评分 |
| `force_refresh` | `boolean` | 否 | 是否跳过缓存强制刷新 |

### 5.1.4 成功响应结构

```json
{
  "request_id": "scr_20260514_0003",
  "success": true,
  "data": {
    "request_context": {},
    "source_summary": {},
    "target_game": {},
    "competitor_candidates": [],
    "competitor_games": [],
    "llm_summary": {},
    "debug_meta": {}
  }
}
```

### 5.1.5 成功响应示例

```json
{
  "request_id": "scr_20260514_0003",
  "success": true,
  "data": {
    "request_context": {
      "request_id": "scr_20260514_0003",
      "raw_query": "Hades",
      "query_type": "auto",
      "resolved_app_id": 1145360,
      "resolved_name": "Hades",
      "locale": "zh-CN",
      "currency": "CNY",
      "generated_at": "2026-05-14T10:15:30+08:00"
    },
    "source_summary": {
      "official_source_count": 3,
      "supplemental_source_count": 2,
      "third_party_source_count": 0,
      "has_partial_failure": false,
      "failed_sources": []
    },
    "target_game": {
      "app_id": 1145360,
      "name": "Hades",
      "steam_url": "https://store.steampowered.com/app/1145360/Hades/",
      "current_players": {
        "value": 37821,
        "display_value": "37,821",
        "is_missing": false,
        "source": "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers",
        "confidence_tier": "A",
        "fetched_at": "2026-05-14T10:15:20+08:00"
      },
      "review_score_desc": {
        "value": "Overwhelmingly Positive",
        "display_value": "好评如潮",
        "is_missing": false,
        "source": "steam_reviews_api/query_summary",
        "confidence_tier": "A",
        "fetched_at": "2026-05-14T10:15:21+08:00"
      },
      "total_reviews": {
        "value": 258734,
        "display_value": "258,734",
        "is_missing": false,
        "source": "steam_reviews_api/query_summary",
        "confidence_tier": "A",
        "fetched_at": "2026-05-14T10:15:21+08:00"
      },
      "price_final": {
        "value": 92,
        "display_value": "¥92",
        "is_missing": false,
        "source": "steam_store_supplement",
        "confidence_tier": "B",
        "fetched_at": "2026-05-14T10:15:22+08:00"
      },
      "owner_estimate_low": {
        "value": 1000000,
        "display_value": "1,000,000",
        "is_missing": false,
        "source": "SteamSpy",
        "confidence_tier": "C",
        "fetched_at": "2026-05-14T10:15:23+08:00"
      },
      "owner_estimate_high": {
        "value": 2000000,
        "display_value": "2,000,000",
        "is_missing": false,
        "source": "SteamSpy",
        "confidence_tier": "C",
        "fetched_at": "2026-05-14T10:15:23+08:00"
      },
      "owner_estimate_note": "基于 SteamSpy 区间估算",
      "tags": [
        "Roguelike",
        "Action Roguelike",
        "Action"
      ],
      "available_fields": [
        "current_players",
        "review_score_desc",
        "total_reviews",
        "price_final"
      ],
      "missing_fields": [],
      "primary_confidence_tier": "A"
    },
    "competitor_candidates": [
      {
        "app_id": 367520,
        "name": "Hollow Knight",
        "total_score": 84.5,
        "selection_reason": "类型接近，价格带接近，评论量级接近",
        "is_selected": true
      }
    ],
    "competitor_games": [
      {
        "app_id": 367520,
        "name": "Hollow Knight"
      },
      {
        "app_id": 632360,
        "name": "Risk of Rain 2"
      }
    ],
    "llm_summary": {
      "status": "success",
      "positioning_summary": "这是一款高口碑、强玩法驱动的动作 Roguelike 产品。",
      "difference_points": [
        "相较 Hollow Knight，动作节奏更快，局内重复游玩驱动力更强。",
        "相较 Risk of Rain 2，单人体验更稳定，内容理解门槛更低。",
        "基于 SteamSpy 拥有量区间估算，它在同类产品中具备更强的外扩覆盖能力。"
      ],
      "screening_recommendation": "建议进入深度研究，重点拆解其长线内容循环和重复游玩设计。",
      "data_caution": "结论同时使用了 Steam 官方公开数据和 SteamSpy 第三方估算数据，估算部分仅作方向性参考。",
      "used_fields": [
        "current_players",
        "review_score_desc",
        "total_reviews",
        "tags",
        "owner_estimate_low",
        "owner_estimate_high"
      ],
      "used_estimate_sources": [
        "SteamSpy"
      ],
      "model_name": "gpt-5",
      "generated_at": "2026-05-14T10:15:29+08:00"
    },
    "debug_meta": {
      "cache_hit": true,
      "data_latency_ms": 1820,
      "llm_latency_ms": 1140,
      "total_latency_ms": 3260,
      "partial_failure": false,
      "warnings": []
    }
  }
}
```

## 6. 健康检查接口

## 6.1 `GET /api/v1/health`

### 6.1.1 接口目标

用于部署验证、探活和监控系统可用性。

### 6.1.2 成功响应示例

```json
{
  "request_id": "health_20260514_0001",
  "success": true,
  "data": {
    "status": "ok",
    "service": "steam-screening-api",
    "timestamp": "2026-05-14T10:20:00+08:00"
  }
}
```

## 7. 错误码定义

| 错误码 | HTTP 状态码 | 说明 | 是否可重试 |
| --- | --- | --- | --- |
| `INVALID_INPUT` | `400` | 输入为空或格式非法 | 否 |
| `PRODUCT_NOT_FOUND` | `404` | 未匹配到 Steam 产品 | 否 |
| `MULTIPLE_MATCHES` | `409` | 命中多个候选，需要用户确认 | 否 |
| `SOURCE_TIMEOUT` | `504` | 上游来源超时 | 是 |
| `SOURCE_UNAVAILABLE` | `503` | 上游来源暂不可用 | 是 |
| `PARTIAL_DATA_ONLY` | `200` | 仅返回部分数据 | 否 |
| `LLM_FAILED` | `200` | 模型失败，但数值结果可返回 | 否 |
| `INTERNAL_ERROR` | `500` | 服务内部异常 | 视情况而定 |

## 8. 部分失败与降级规则

### 8.1 数据源部分失败

如果部分来源失败，但目标产品核心数据仍可展示：

- 接口仍返回 `200`
- `success=true`
- `source_summary.has_partial_failure=true`
- `debug_meta.partial_failure=true`
- `source_summary.failed_sources` 填充失败来源
- 页面展示“部分数据暂不可用”

### 8.2 LLM 失败

如果数值数据正常，但模型总结失败：

- 接口仍返回 `200`
- `llm_summary.status=failed` 或 `degraded`
- `llm_summary.positioning_summary` 可为空
- 页面优先展示结构化数据，不阻塞主流程

### 8.3 重名产品

如果输入命中多个候选：

- `resolve` 接口返回候选列表
- `screen` 接口可直接返回 `MULTIPLE_MATCHES`
- 前端应先引导用户确认后再发起正式分析

## 9. 联调规则

### 9.1 前端必须遵守

- 对 `metric object` 先判断 `is_missing`
- 不得假设所有字段总会返回
- `competitor_games` 固定按 2 个处理，但应允许后续扩展
- 当 `llm_summary.status != success` 时，页面仍需正常展示

### 9.2 后端必须遵守

- 不得在缺失字段上填业务默认值冒充真实结果
- 所有关键字段必须带来源与可信等级
- 所有成功响应必须返回 `request_id`
- 所有失败响应必须返回结构化 `error`
- 如果 `llm_summary` 使用了 C 级字段，必须同时回传 `used_estimate_sources`
- 如果返回了 C 级估算字段，`data_caution` 中必须提醒这是第三方估算数据

## 10. 与字段字典的关系

本接口契约规定“怎么传”。

字段字典规定“每个字段是什么意思”。

两份文档必须同步维护：

- 字段新增或删除时，同时修改接口契约和字段字典
- 枚举变更时，同时修改接口示例和错误码说明
- V2 如果加入第三方估算字段，必须先修改字段字典再进入接口
