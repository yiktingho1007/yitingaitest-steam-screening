# Steam 产品初筛工具字段字典

- 状态：Draft v0.1
- 最后更新：2026-05-14
- 适用范围：V1
- 文档目标：定义前后端统一字段结构、字段含义、数据类型、可信等级和展示用途，作为开发、联调、测试和 Prompt 设计的共同基线

## 1. 字段设计原则

### 1.1 基本原则

- 所有前后端共享字段统一使用 `snake_case`
- 时间字段统一使用 ISO 8601 格式，带时区
- 金额字段保留原始数值和展示值
- 关键指标字段必须带来源和可信等级
- 缺失字段不允许省略语义，必须明确标记是否缺失

### 1.2 顶层结构

V1 建议以如下顶层对象组织数据：

1. `request_context`
2. `source_summary`
3. `target_game`
4. `competitor_candidates`
5. `competitor_games`
6. `llm_summary`
7. `debug_meta`

### 1.3 指标包装对象

为了保证字段可追溯，建议所有核心指标采用统一包装结构：

```json
{
  "value": 37821,
  "display_value": "37,821",
  "is_missing": false,
  "source": "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers",
  "confidence_tier": "A",
  "fetched_at": "2026-05-14T10:15:20+08:00"
}
```

说明：

- `value`：原始值，供计算和排序使用
- `display_value`：展示值，供前端直接显示
- `is_missing`：字段是否缺失
- `source`：数据来源标识
- `confidence_tier`：`A`、`B`、`C`
- `fetched_at`：该字段最近拉取时间

## 2. 枚举定义

### 2.1 `query_type`

| 值 | 含义 |
| --- | --- |
| `auto` | 系统自动判断输入类型 |
| `name` | 按游戏名解析 |
| `steam_url` | 按 Steam 商店链接解析 |
| `app_id` | 按 `AppID` 解析 |

### 2.2 `confidence_tier`

| 值 | 含义 |
| --- | --- |
| `A` | 官方公开且文档支持明确 |
| `B` | 公开可获取但仅作补充说明 |
| `C` | 第三方估算来源，允许进入结论但必须明确标注为估算 |

### 2.3 `release_status`

| 值 | 含义 |
| --- | --- |
| `released` | 已发售 |
| `coming_soon` | 即将推出 |
| `early_access` | 抢先体验中 |
| `unknown` | 未知 |

### 2.4 `comparison_band`

| 值 | 含义 |
| --- | --- |
| `very_low` | 很低量级 |
| `low` | 低量级 |
| `mid` | 中量级 |
| `high` | 高量级 |
| `very_high` | 很高量级 |
| `unknown` | 未知 |

### 2.5 `llm_status`

| 值 | 含义 |
| --- | --- |
| `success` | 模型正常返回 |
| `degraded` | 模型部分降级 |
| `failed` | 模型未返回可用内容 |
| `skipped` | 本次未调用模型 |

## 3. 顶层字段定义

## 3.1 `request_context`

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `request_id` | `string` | 是 | 本次请求唯一标识 | `scr_20260514_0001` |
| `raw_query` | `string` | 是 | 用户原始输入 | `Hades` |
| `query_type` | `string` | 是 | 输入类型，见枚举 | `auto` |
| `resolved_app_id` | `number` | 是 | 最终识别出的 `AppID` | `1145360` |
| `resolved_name` | `string` | 是 | 最终识别出的游戏名 | `Hades` |
| `locale` | `string` | 是 | 页面语言环境 | `zh-CN` |
| `currency` | `string` | 否 | 展示币种 | `CNY` |
| `generated_at` | `string` | 是 | 本次结果生成时间 | `2026-05-14T10:15:30+08:00` |

## 3.2 `source_summary`

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `official_source_count` | `number` | 是 | 本次命中的 A 级来源数量 | `3` |
| `supplemental_source_count` | `number` | 是 | 本次命中的 B 级来源数量 | `2` |
| `third_party_source_count` | `number` | 是 | 本次命中的 C 级来源数量 | `0` |
| `has_partial_failure` | `boolean` | 是 | 是否存在局部来源失败 | `false` |
| `failed_sources` | `string[]` | 否 | 失败来源列表 | `[]` |

## 4. 产品对象定义

`target_game` 和 `competitor_games[]` 共享同一套字段结构。

## 4.1 基础身份字段

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 展示位置 |
| --- | --- | --- | --- | --- | --- |
| `app_id` | `number` | 是 | A | Steam 应用唯一 ID | 标题区、调试区 |
| `name` | `string` | 是 | A/B | 游戏名称 | 标题区 |
| `steam_url` | `string` | 是 | A/B | Steam 商店链接 | 标题区 |
| `capsule_image_url` | `string` | 否 | B | 商店胶囊图 | 标题卡 |
| `header_image_url` | `string` | 否 | B | 商店头图 | 详情扩展区 |

## 4.2 商业信息字段

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `is_free` | `boolean` | 是 | B | 是否免费 | 免费产品价格字段可为空 |
| `price_initial` | `metric object` | 否 | B | 原价 | 用于对比和价格带判断 |
| `price_final` | `metric object` | 否 | B | 当前售价 | 用于展示和竞品筛选 |
| `discount_percent` | `metric object` | 否 | B | 折扣百分比 | 例如 `20` |
| `currency` | `string` | 否 | B | 当前价格币种 | 例如 `CNY` |
| `price_band` | `string` | 否 | B | 价格带标签 | 例如 `mid` |

## 4.3 发售与阶段字段

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `release_date` | `metric object` | 否 | B | 发售日期 | 用于阶段判断 |
| `release_status` | `string` | 是 | B | 发售状态 | 见 `release_status` 枚举 |
| `is_early_access` | `boolean` | 否 | B | 是否抢先体验 | 可与发售状态联合展示 |

## 4.4 口碑字段

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `review_score` | `metric object` | 是 | A | 评测分值或内部映射分 | 供排序和对比使用 |
| `review_score_desc` | `metric object` | 是 | A | 评测文本，如“特别好评” | 页面主展示文案 |
| `total_positive_reviews` | `metric object` | 是 | A | 好评总数 | 评论结构判断 |
| `total_negative_reviews` | `metric object` | 是 | A | 差评总数 | 评论结构判断 |
| `total_reviews` | `metric object` | 是 | A | 总评测数 | 体量判断核心字段 |
| `review_volume_band` | `string` | 是 | A | 评论量级标签 | 竞品打分维度 |
| `review_samples` | `object[]` | 否 | A | 评论样本 | V1 可选返回 |

### 4.4.1 `review_samples[]`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `language` | `string` | 是 | 评论语言 |
| `voted_up` | `boolean` | 是 | 是否好评 |
| `review_text` | `string` | 是 | 评论正文 |
| `playtime_at_review` | `number` | 否 | 写评测时游戏时长，单位分钟 |
| `timestamp_created` | `string` | 是 | 评论创建时间 |

## 4.5 活跃度字段

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `current_players` | `metric object` | 是 | A | 当前在线人数 | V1 核心指标 |
| `current_players_band` | `string` | 是 | A | 当前在线量级标签 | 竞品打分维度 |

## 4.6 描述性字段

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `developers` | `string[]` | 否 | B | 开发商列表 | 页面详情区 |
| `publishers` | `string[]` | 否 | B | 发行商列表 | 页面详情区 |
| `genres` | `string[]` | 否 | B | 类型列表 | 竞品筛选辅助 |
| `tags` | `string[]` | 否 | B | 标签列表 | 竞品筛选辅助 |
| `supported_languages` | `string[]` | 否 | B | 支持语言列表 | 页面详情区 |
| `short_description` | `string` | 否 | B | 简短描述 | 产品认知补充 |

## 4.7 来源与可用性字段

| 字段 | 类型 | 必填 | 说明 | 备注 |
| --- | --- | --- | --- | --- |
| `available_fields` | `string[]` | 是 | 当前成功获取的字段列表 | 便于前端条件渲染 |
| `missing_fields` | `string[]` | 是 | 当前缺失字段列表 | 便于风控和提示 |
| `primary_confidence_tier` | `string` | 是 | 当前产品主要可信等级 | 通常为 `A` 或 `B` |

## 4.8 估算类字段

以下字段用于接入 SteamSpy 等第三方估算信号。它们允许进入主结论，但页面和模型文本必须明确写出来源与“估算”属性。

| 字段 | 类型 | 必填 | 可信等级 | 说明 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `owner_estimate_low` | `metric object` | 否 | C | 拥有量估算下限 | 适用于区间型来源 |
| `owner_estimate_high` | `metric object` | 否 | C | 拥有量估算上限 | 适用于区间型来源 |
| `owner_estimate_note` | `string` | 否 | C | 拥有量估算说明 | 例如“基于 SteamSpy 区间估算” |
| `revenue_estimate` | `metric object` | 否 | C | 收入估算值 | 若来源提供可接入 |
| `sales_estimate` | `metric object` | 否 | C | 销量估算值 | 若来源提供可接入 |
| `wishlist_estimate` | `metric object` | 否 | C | 愿望单估算值 | 若来源提供可接入 |
| `estimate_sources` | `string[]` | 否 | C | 本产品估算字段使用到的来源列表 | 例如 `["SteamSpy"]` |

## 5. 竞品候选字段

`competitor_candidates[]` 用于解释系统为什么选出最终竞品。

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `app_id` | `number` | 是 | 候选产品 `AppID` | `367520` |
| `name` | `string` | 是 | 候选产品名称 | `Hollow Knight` |
| `total_score` | `number` | 是 | 候选总分 | `84.5` |
| `tag_overlap_score` | `number` | 否 | 标签重叠得分 | `28` |
| `price_similarity_score` | `number` | 否 | 价格相似度得分 | `18` |
| `release_stage_score` | `number` | 否 | 发售阶段相似度得分 | `10` |
| `review_volume_score` | `number` | 否 | 评论量级相似度得分 | `15` |
| `current_players_score` | `number` | 否 | 在线量级相似度得分 | `13.5` |
| `selection_reason` | `string` | 是 | 入选原因摘要 | `类型接近，价格带接近，评论量级接近` |
| `is_selected` | `boolean` | 是 | 是否进入最终 2 个竞品 | `true` |

## 6. LLM 输出字段

## 6.1 `llm_summary`

| 字段 | 类型 | 必填 | 说明 | 备注 |
| --- | --- | --- | --- | --- |
| `status` | `string` | 是 | 模型执行状态 | 见 `llm_status` 枚举 |
| `positioning_summary` | `string` | 否 | 一句话产品定位 | 面向决策者 |
| `difference_points` | `string[]` | 否 | 与两款竞品的差异点 | 建议固定 3 条 |
| `screening_recommendation` | `string` | 否 | 是否值得继续深挖 | 建议一句话 |
| `data_caution` | `string` | 否 | 数据边界或风险提示 | 必填优先级高 |
| `used_fields` | `string[]` | 否 | 本次总结引用的字段名 | 便于审计 |
| `used_estimate_sources` | `string[]` | 否 | 本次结论中引用的估算来源 | 如果用了 C 级字段则必填 |
| `model_name` | `string` | 否 | 使用的模型标识 | 便于追踪 |
| `generated_at` | `string` | 否 | 模型输出时间 | 便于审计 |

## 7. 调试与运行字段

## 7.1 `debug_meta`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `cache_hit` | `boolean` | 是 | 本次是否命中缓存 |
| `data_latency_ms` | `number` | 是 | 数据拉取耗时 |
| `llm_latency_ms` | `number` | 否 | 模型耗时 |
| `total_latency_ms` | `number` | 是 | 总耗时 |
| `partial_failure` | `boolean` | 是 | 是否出现局部失败 |
| `warnings` | `string[]` | 否 | 运行警告列表 |

## 8. 字段优先级建议

### 8.1 页面首屏必须展示

- `name`
- `app_id`
- `review_score_desc`
- `total_reviews`
- `current_players`
- `price_final`
- `release_date`
- `tags`
- `positioning_summary`

### 8.2 首屏建议展示但允许折叠

- `developers`
- `publishers`
- `supported_languages`
- `discount_percent`
- `short_description`
- `data_caution`

### 8.3 仅调试或说明区展示

- `available_fields`
- `missing_fields`
- `used_fields`
- `failed_sources`
- `cache_hit`
- `latency_ms`

## 9. 字段缺失处理规则

- 如果某字段不存在，不得写默认业务值
- 所有缺失字段必须在 `missing_fields` 中出现
- 前端对 `metric object` 类型字段，应优先判断 `is_missing`
- LLM 不得将缺失字段转写为确定性结论
- 如果 LLM 使用了 C 级估算字段，必须同时输出来源名和“估算”提示

## 10. 后续扩展预留字段

以下字段建议继续预留：

- `historical_peak_players`
- `recent_discount_history`
- `franchise`
- `series_tags`
