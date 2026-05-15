# Steam 产品初筛工具：数据拉取与 LLM 接入方案

- 状态：Draft v0.1
- 最后更新：2026-05-14
- 目标：说明本地原型如何从 mock 过渡到“真实结构化数据 + 真实 LLM 总结”

## 1. 当前阶段定位

当前这一步的目标不是一次性接完整个正式系统，而是先把下面这条链路跑通：

1. 前端输入游戏名
2. 前端识别到一个目标产品或候选产品
3. 前端拿到一份结构化产品报告
4. 后端用这份报告拼接 prompt
5. 后端调用 OpenAI Responses API
6. 返回研究员可读的初筛结论

当前版本的边界：

- `结构化数据层`：仍然使用 mock 报告
- `LLM 总结层`：已经改为真实请求
- `密钥管理`：只放在本地后端，不进入前端

## 2. 数据拉取路线图

### 2.1 V1.1：原型真实 LLM

目标：

- 不改动当前页面主路径
- 保留 mock 结构化数据
- 先验证真实 LLM 在本地原型上的表现、耗时和稳定性

当前已落地：

- 本地 `/api/status`
- 本地 `/api/analyze`
- `.env.local` 读取
- OpenAI Responses API 请求
- 失败自动回退到 mock 总结

### 2.2 V1.2：真实目标产品拉数

下一步建议先接目标产品，不先接完整竞品引擎。

推荐顺序：

1. `输入解析`
   - 输入游戏名、Steam URL、AppID
   - 先解析出候选 AppID

2. `目标产品基础识别`
   - 主来源：Steam `IStoreService/GetAppList`
   - 作用：名称匹配、AppID 定位、基础索引缓存

3. `核心指标拉取`
   - 评论摘要：Steam Reviews API
   - 当前在线：`ISteamUserStats/GetNumberOfCurrentPlayers`
   - 商店补充字段：Steam 商店公开页面字段

4. `第三方估算补充`
   - 估算拥有量或销量区间：SteamSpy 等
   - 必须显式写来源和“估算”属性

### 2.3 V1.3：真实竞品选择

目标：

- 从“mock 固定竞品”切到“真实规则打分竞品”

推荐输入信号：

- 标签重叠
- 价格带
- 发售阶段
- 评论量级
- 当前在线量级
- 是否早期体验
- 是否同系列 / 同开发商 / 同明显心智

## 3. 字段来源映射

| 字段 | 主来源 | 备用来源 | 是否可进入主结论 | 备注 |
| --- | --- | --- | --- | --- |
| `resolved_app_id` | Steam `IStoreService/GetAppList` | Steam 商店搜索结果 | 是 | 先做产品识别 |
| `name` | Steam 官方索引 | Steam 商店页 | 是 | 核心识别字段 |
| `review_score_desc` | Steam Reviews API | 无 | 是 | A 级 |
| `total_reviews` | Steam Reviews API | 无 | 是 | A 级 |
| `current_players` | `ISteamUserStats/GetNumberOfCurrentPlayers` | 无 | 是 | A 级 |
| `price_final` | Steam 商店公开字段 | SteamDB 人工核验 | 是 | B 级补充 |
| `release_date` | Steam 商店公开字段 | SteamDB 人工核验 | 是 | B 级补充 |
| `tags` | Steam 商店公开字段 | SteamDB | 是 | 用于竞品打分 |
| `owner_estimate_low/high` | SteamSpy | 其他第三方估算源 | 是，但必须标注估算 | C 级 |

## 4. Prompt 设计

### 4.1 设计原则

- 模型只解释结构化数据，不自己联网找数
- 模型只输出研究员能直接用的短结论
- 模型不能编造销量、收入、留存、愿望单等未提供字段
- 模型如果用到估算字段，必须把来源写出来

### 4.2 Prompt 结构

建议固定成两段：

1. `developer instructions`
   - 角色：莉莉丝预研助手
   - 规则：禁止编造、必须标注估算、输出中文 JSON
   - 输出键：固定 schema

2. `user payload`
   - `request_context`
   - `target_game`
   - `competitor_games`
   - `competitor_candidates`
   - `source_summary`
   - `warnings`

### 4.3 当前输出 schema

```json
{
  "positioning_summary": "string",
  "difference_points": ["string", "string", "string"],
  "screening_recommendation": "string",
  "data_caution": "string",
  "used_fields": ["string"],
  "used_estimate_sources": ["string"]
}
```

## 5. OpenAI 接入策略

### 5.1 当前接法

当前原型使用：

- OpenAI `Responses API`
- `text.format = { type: "json_object" }`
- 本地后端发请求
- 前端只调用本地 `/api/analyze`

兼容策略：

- 如果网关支持 `Responses API`，优先走 `responses`
- 如果网关不支持 `Responses API`，自动回退到 `chat/completions`
- `OPENAI_BASE_URL` 可以直接填写网关根地址，后端会自动补成 `/v1`

这样做的原因：

- 接法更适合新项目
- 不把密钥暴露到浏览器
- 便于后面继续挂结构化输入、日志和降级逻辑

### 5.2 模型选择建议

今天查到的 OpenAI 官方模型页建议是：

- 复杂推理优先从 `gpt-5.5` 开始
- 更关心延迟和成本时，可用更小型号

当前原型默认值设为：

- `gpt-5.4-mini`

原因：

- 对原型阶段更稳妥
- 成本和速度更适合频繁调试
- 后续可通过 `.env.local` 随时切到 `gpt-5.5`

## 6. 接口设计

### 6.1 `GET /api/status`

作用：

- 前端检查本地后端是否已配置模型密钥
- 页面在入口处直接告诉用户当前是“实时 LLM”还是“mock 回退”

### 6.2 `POST /api/analyze`

请求：

- `query`
- `report`

响应：

- `analysis_mode`
  - `live`
  - `mock_fallback`
- `llm`
  - 是否已配置
  - 当前模型
  - 是否报错
- `report`
  - 合并后的完整报告
  - 其中 `llm_summary` 已被实时结果或回退结果覆盖

## 7. 降级规则

### 7.1 未配置密钥

页面仍然可以跑：

- 入口页显示“LLM 未配置”
- 分析接口返回 `mock_fallback`
- 结果页明确显示“Mock 回退”

### 7.2 LLM 请求失败

页面仍然可以跑：

- 后端记录错误
- 结果页继续返回 mock 摘要
- 警告写入 `debug_meta.warnings`

### 7.3 结构化数据缺字段

模型侧规则：

- 必须写“暂无可靠公开数据”
- 不允许靠经验补数

## 8. 下一步建议

按敏捷节奏，推荐继续往下走：

1. 先让你把本地密钥放进 `.env.local`
2. 验证这版原型能稳定拿到真实 LLM 结论
3. 选第一批真实 Steam 拉数字段
4. 把“目标产品拉数”替换掉 mock
5. 再把“竞品选择”替换掉 mock
