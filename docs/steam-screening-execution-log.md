# Steam 产品初筛工具执行记录

- 状态：进行中
- 最后更新：2026-05-14
- 目标：持续记录项目每一步做了什么、改了什么、为什么这样改，以及下一步准备做什么

## 1. 记录规则

这份文档作为项目的执行日志与改动记忆。

后续每次更新，默认记录：

- 日期
- 本次目标
- 已完成工作
- 已做决策
- 新增或修改文件
- 下一步

## 2. 当前文档清单

| 文件 | 作用 |
| --- | --- |
| `docs/steam-screening-tool-prd.md` | 产品目标、范围、来源策略、里程碑 |
| `docs/steam-screening-execution-log.md` | 执行记录、改动记录、路线图快照 |
| `docs/steam-screening-field-dictionary.md` | 统一字段结构与字段含义 |
| `docs/steam-screening-api-contract.md` | 接口请求、响应、错误码、降级规则 |
| `docs/steam-screening-live-integration-plan.md` | 真实 LLM 接入与后续真实拉数方案 |

## 3. 决策记录

### 2026-05-14

- 工具核心职责是 `Steam 产品初筛`，不是完整市场情报系统
- 必须把 `可靠数据层` 和 `LLM 解释层` 分开
- 数据按 `A/B/C` 三档可信度管理
- V1 固定展示 `目标产品 + 2 款竞品`
- 文档、执行记录、路线图默认使用中文
- SteamDB 适合作为高可信补充源，不适合作为 V1 主抓取源
- SteamSpy 等第三方估算数据可以进入主结论，但必须显式标注来源与估算属性
- 原型阶段优先验证可用性和分析路径，不急于一次性工程化到最完整
- 真实密钥只放在本地后端，不通过前端或聊天上下文传递

## 4. 工作记录

### Entry 001

- 日期：2026-05-14
- 本次目标：定义这个 Steam 初筛工具的设计、开发、部署工作流
- 已完成工作：
  - 明确服务对象为莉莉丝预研团队
  - 明确产品目标是“快速初筛”，不是“完整研究报告”
  - 梳理整体链路：输入、识别、拉数、竞品、总结
  - 初步梳理适合 V1 的 Steam 数据能力边界
  - 提出 A/B/C 三层数据分级方案
  - 建立第一版产品工作流与交付路线图
- 已做决策：
  - V1 只承诺“产品快照 + 2 款竞品 + 一段受控总结”
  - 模型只解释结构化数据，不负责找数
  - 页面关键字段必须显示来源和更新时间
- 新增或修改文件：
  - `docs/steam-screening-tool-prd.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 建立字段字典
  - 定义统一 JSON 结构
  - 选择实现方式

### Entry 002

- 日期：2026-05-14
- 本次目标：将项目核心文档切换为中文
- 已完成工作：
  - 将 PRD 改写为中文
  - 将执行记录改写为中文
- 已做决策：
  - 后续产品文档默认使用中文
- 新增或修改文件：
  - `docs/steam-screening-tool-prd.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 建立字段字典
  - 建立接口契约

### Entry 003

- 日期：2026-05-14
- 本次目标：补齐可直接指导开发的字段字典与接口契约
- 已完成工作：
  - 新建 V1 字段字典
  - 定义统一顶层结构
  - 定义统一指标包装结构
  - 新建 V1 接口契约
  - 定义 `resolve`、`screen`、`health` 三个接口
  - 明确错误码、局部失败与 LLM 失败时的规则
- 已做决策：
  - 主分析接口先采用同步返回
  - 结构化数据结果优先于模型结论
  - LLM 失败时不阻塞结构化结果显示
- 新增或修改文件：
  - `docs/steam-screening-field-dictionary.md`
  - `docs/steam-screening-api-contract.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 细化来源策略
  - 继续完善竞品逻辑
  - 开始拆分原型模块

### Entry 004

- 日期：2026-05-14
- 本次目标：明确 SteamDB 的角色
- 已完成工作：
  - 在 PRD 中把 SteamDB 明确定位为 B 级高可信补充源
  - 明确 SteamDB 更适合人工复核、交叉验证、历史参考、外跳详情
- 已做决策：
  - V1 仍应以 Steam 官方公开接口作为主链路
  - SteamDB 不作为高频自动抓取主接口
- 新增或修改文件：
  - `docs/steam-screening-tool-prd.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续细化来源标注方式
  - 继续明确页面展示口径

### Entry 005

- 日期：2026-05-14
- 本次目标：调整第三方估算数据进入主结论的规则
- 已完成工作：
  - 修改 PRD，允许 SteamSpy 类数据进入主结论
  - 在字段字典中新增估算类字段定义
  - 在接口契约中加入估算字段开关与返回规则
- 已做决策：
  - 第三方估算数据可以进入主结论
  - 进入主结论时必须明确写出来源与估算属性
- 新增或修改文件：
  - `docs/steam-screening-tool-prd.md`
  - `docs/steam-screening-field-dictionary.md`
  - `docs/steam-screening-api-contract.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 建立本地原型
  - 用 mock 数据验证产品路径

### Entry 006

- 日期：2026-05-14
- 本次目标：启动本地 mock 原型开发
- 已完成工作：
  - 在 `prototype` 目录下搭建本地原型
  - 建立静态服务、页面结构、样式和 mock 数据
  - 第一版原型包含输入区、目标产品、两款竞品、来源分层、LLM 总结与调试区
  - 内置 3 组 mock case：`Balatro`、`Hades II`、`Schedule I`
- 已做决策：
  - 原型阶段优先验证信息结构与研究可用性
  - mock 数据按正式接口契约组织，减少后续重构成本
- 新增或修改文件：
  - `prototype/package.json`
  - `prototype/server.js`
  - `prototype/index.html`
  - `prototype/styles.css`
  - `prototype/mock-data.js`
  - `prototype/app.js`
  - `prototype/README.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 验证本地启动
  - 收集可用性观察

### Entry 007

- 日期：2026-05-14
- 本次目标：验证本地 mock 原型基础链路
- 已完成工作：
  - 检查核心脚本语法
  - 启动本地服务并确认首页返回 `200`
  - 确认首页关键文案可见
- 已做决策：
  - 原型已具备进入第一轮可用性讨论的基础
- 新增或修改文件：
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续观察信息密度和路径顺序

### Entry 008

- 日期：2026-05-14
- 本次目标：让 mock 原始数据在页面中可见
- 已完成工作：
  - 新增“当前 mock 原始数据”面板
  - 让当前结果页可直接展开查看报告 JSON
- 已做决策：
  - 原型阶段不仅展示结果页，也展示驱动结果页的数据结构
- 新增或修改文件：
  - `prototype/index.html`
  - `prototype/styles.css`
  - `prototype/app.js`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续收集第一轮可用性反馈

### Entry 009

- 日期：2026-05-14
- 本次目标：把原型改成“极简入口 -> loading -> 结果页”的单路径
- 已完成工作：
  - 重构首页为极简搜索入口
  - 独立出 loading 页
  - 收纳调试与 raw JSON 到结果页折叠区
  - 保留模糊输入命中 mock case
- 已做决策：
  - 首屏必须轻，不能一开始就堆满结构化模块
  - loading 是用户心智的一部分，不只是装饰
- 新增或修改文件：
  - `prototype/index.html`
  - `prototype/styles.css`
  - `prototype/app.js`
  - `prototype/README.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 验证重构后的单路径可用性

### Entry 010

- 日期：2026-05-14
- 本次目标：验证重构后的单路径原型能够正常启动
- 已完成工作：
  - 检查脚本语法
  - 启动本地服务并验证入口页、loading、结果页关键文案
- 已做决策：
  - 当前路径已满足“入口页 -> loading -> 结果页”的基础要求
- 新增或修改文件：
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续压结果页的信息密度

### Entry 011

- 日期：2026-05-14
- 本次目标：修复“点击开始分析没有返回内容”的阻断问题
- 已完成工作：
  - 新增任意非空输入的 mock 兜底映射逻辑
  - 新增结果页渲染异常保护与错误页
  - 新增 smoke test
  - 发现并修复 `mock-data.js` 与 `app.js` 对 `MOCK_REPORTS` 的重复声明
  - 为静态资源增加版本号
  - 为静态服务增加 `no-store`
- 已做决策：
  - 原型阶段最重要的是主路径一定要跑通
  - 明确报错或回退优先于“无响应”
- 新增或修改文件：
  - `prototype/index.html`
  - `prototype/styles.css`
  - `prototype/app.js`
  - `prototype/smoke-test.mjs`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 做真实点击验证

### Entry 012

- 日期：2026-05-14
- 本次目标：为多命中场景增加候选选择页
- 已完成工作：
  - 在搜索页和 loading 之间新增候选选择页
  - 调整查询流程为：
    - 单命中：直接进入 loading
    - 多命中：先进入候选选择页
    - 无命中：继续使用 mock 兜底映射
  - 新增 `Hades` mock case，用于真实触发多候选场景
  - 更新 smoke test
- 已做决策：
  - 当系统把握不足时，应把选择权还给分析师
  - 候选选择页只解决“你指的是哪一款”这个问题
- 新增或修改文件：
  - `prototype/index.html`
  - `prototype/styles.css`
  - `prototype/app.js`
  - `prototype/mock-data.js`
  - `prototype/smoke-test.mjs`
  - `prototype/README.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 开始接真实 LLM

### Entry 013

- 日期：2026-05-14
- 本次目标：把本地原型从“纯 mock 总结”升级为“mock 结构化数据 + 真实 LLM 总结”
- 已完成工作：
  - 为原型新增本地后端接口：
    - `GET /api/status`
    - `POST /api/analyze`
  - 新增本地 `.env.local` 读取逻辑，允许密钥只保存在后端
  - 接入 OpenAI Responses API，用结构化产品报告去生成真实 LLM 初筛结论
  - 保留自动降级：
    - 未配置密钥时，自动回退到 mock 总结
    - 模型请求失败时，自动回退到 mock 总结
  - 重写前端分析流程：
    - 入口页显示 LLM 是否已连接
    - loading 期间真实调用后端分析接口
    - 结果页显示本次是“实时 LLM”还是“mock 回退”
  - 新增接入说明文档，明确记录：
    - 下一阶段真实 Steam 拉数顺序
    - prompt 结构
    - 字段来源映射
    - 降级规则
  - 新增本地配置模板和忽略规则，避免密钥进入版本控制
- 已做决策：
  - 先只把 LLM 层接真，不急着一次性把结构化数据层也全部接真
  - 原型默认模型使用 `gpt-5.4-mini`，兼顾速度与成本，后续可切到 `gpt-5.5`
  - 真实密钥不通过聊天直接发送，统一放到本地 `.env.local`
- 新增或修改文件：
  - `.gitignore`
  - `prototype/.env.example`
  - `prototype/llm-analysis.js`
  - `prototype/server.js`
  - `prototype/index.html`
  - `prototype/app.js`
  - `prototype/styles.css`
  - `prototype/README.md`
  - `prototype/smoke-test.mjs`
  - `docs/steam-screening-live-integration-plan.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 由用户在本地放入 OpenAI 密钥
  - 验证真实 LLM 请求是否稳定
  - 开始替换第一批真实 Steam 字段

### Entry 014

- 日期：2026-05-14
- 本次目标：兼容用户提供的模型网关地址
- 已完成工作：
  - 将本地原型配置改为走 `https://ai.shukelongda.cn`
  - 后端新增网关兼容逻辑：
    - 优先请求 `Responses API`
    - 不支持时自动回退到 `Chat Completions`
  - 增加了 base URL 自动补 `/v1` 的处理
  - README 和接入方案文档同步更新
- 已做决策：
  - 原型阶段不假设所有兼容网关都支持 `Responses API`
  - 只要能稳定输出受控 JSON，总结层允许走兼容接口
- 新增或修改文件：
  - `prototype/llm-analysis.js`
  - `prototype/.env.local`
  - `prototype/README.md`
  - `docs/steam-screening-live-integration-plan.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 在用户本机验证兼容网关下是否能进入 `live`
  - 如果仍失败，继续看网关的鉴权方式或模型名要求

### Entry 015

- 日期：2026-05-14
- 本次目标：修复“后端不可用，当前无法检测 LLM 状态”的误导性提示
- 已完成工作：
  - 前端新增文件直开模式识别
  - 当页面通过 `file://` 打开时，自动改为请求 `http://127.0.0.1:4173`
  - 前端错误提示细化为：
    - 文件直开但服务未启动
    - 已通过服务打开，但接口不可用
  - 后端为 `/api/*` 新增 CORS 支持和 `OPTIONS` 预检处理
  - 验证了预检响应包含允许跨域的头部
- 已做决策：
  - 原型应同时兼容两种打开方式：
    - 推荐的本地服务访问
    - 已经双击打开 HTML 文件的临时体验
- 新增或修改文件：
  - `prototype/app.js`
  - `prototype/server.js`
  - `prototype/README.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 让用户直接重新刷新页面验证
  - 如果仍无法进入 live，再继续看网关返回的具体错误

### Entry 016

- 日期：2026-05-14
- 本次目标：代替用户拉起本地原型服务，并验证浏览器与本地接口连通性
- 已完成工作：
  - 确认 `127.0.0.1:4173` 最初没有监听，所以浏览器报 `ERR_CONNECTION_REFUSED`
  - 排查出当前 PowerShell 会话存在 `Path/PATH` 环境冲突，导致常规后台启动方式不稳定
  - 改用独立 Node 进程方式拉起本地原型服务
  - 验证首页 `http://127.0.0.1:4173/` 返回 `200`
  - 验证 `/api/status` 返回正常，并能读到本地 `.env.local`
  - 进一步验证 `/api/analyze` 目前仍然回退到 `mock_fallback`
  - 当前已定位到下一层问题是模型网关请求失败：`fetch failed`
- 已做决策：
  - 启动服务问题与模型网关问题分开处理
  - 先保证浏览器能进本地原型，再继续看外部网关连通性
- 新增或修改文件：
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 让用户在浏览器刷新页面
  - 检查网关为何从本机请求时仍然 `fetch failed`

### Entry 017

- 日期：2026-05-14
- 本次目标：在用户开放权限后，继续尝试解除原型的本地运行限制，并验证是否能让浏览器页稳定连上 live LLM
- 已完成工作：
  - 为当前会话申请并获得了额外网络权限，用于验证模型网关与本地服务链路
  - 补全了前端的多后端候选逻辑，页面现在会优先尝试可用的本地分析后端，而不是只依赖单一地址
  - 重新验证了 `prototype/app.js`、`prototype/server.js`、`prototype/llm-analysis.js` 的语法
  - 在持久 Node 内核中成功挂起了本地测试服务，并确认 `127.0.0.1` 端口监听本身没有问题
  - 再次验证了受限常驻环境下的 `/api/analyze` 仍会因 `EACCES 103.201.130.161:443` 回退到 `mock_fallback`
- 已做决策：
  - 明确认定“页面逻辑问题”和“Codex 常驻本地服务的外网访问限制”是两层不同问题
  - 当前可以继续优化原型与数据接入代码，但不能在本会话内直接关闭 Codex 自带的长期运行限制
  - 后续需要把真实 live 运行形态切换到普通本地进程或外部部署环境，而不是继续依赖受限常驻后端
- 新增或修改文件：
  - `prototype/app.js`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 开始接第一批真实 Steam 字段
  - 把 live 运行方式收敛到普通本地进程或部署环境
  - 继续保留 mock 结构化数据作为前端快速迭代底座

### Entry 018

- 日期：2026-05-14
- 本次目标：把 LLM 请求从本地后端代理改成“网页直接请求模型网关”
- 已完成工作：
  - 新增了浏览器侧 LLM 直连模块 `prototype/browser-llm.js`
  - 把前端分析流程改成直接在浏览器里请求模型网关，不再依赖 `/api/analyze`
  - 增加了本地浏览器运行配置生成脚本 `prototype/sync-browser-runtime-config.mjs`
  - 生成了 `prototype/browser-runtime-config.js`，供当前本地原型页面直接加载
  - 更新了原型首页脚本加载顺序，让页面优先读浏览器直连配置
  - 更新了 smoke test，改为验证“浏览器直连 + live 返回”这条新链路
  - 在浏览器里实际验证了 `Balatro` 可走到 live 结果页，结果页显示 `LLM：browser_responses · gpt-5.4-mini`
- 已做决策：
  - 本地原型阶段允许网页直接持有网关密钥，以换取开发联调效率
  - 该方案仅限本地原型，不作为生产方案沿用
  - 生产阶段仍需改回后端安全代理
- 新增或修改文件：
  - `prototype/browser-llm.js`
  - `prototype/browser-runtime-config.js`
  - `prototype/sync-browser-runtime-config.mjs`
  - `prototype/index.html`
  - `prototype/app.js`
  - `prototype/server.js`
  - `prototype/smoke-test.mjs`
  - `prototype/package.json`
  - `prototype/README.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 开始接第一批真实 Steam 字段
  - 把 mock 结构化字段逐步替换成真实拉数
  - 保留浏览器直连模式作为本地原型联调通道

### Entry 019

- 日期：2026-05-14
- 本次目标：把结构化数据主链路从 mock 切换成真实公开数据
- 已完成工作：
  - 新增了 `prototype/live-steam-data.js`，用于实时拉取 Steam Store、Steam Reviews、Current Players、SteamSpy 和搜索建议
  - 本地服务新增了 `/api/resolve` 和 `/api/live-report` 两个接口
  - 前端搜索入口改成先走实时识别，再走实时公开数据拉取
  - 页面文案从 `Mock` 更新成 `Live`
  - 浏览器里实际验证了中文输入 `杀戮尖塔` 可以识别为 `Slay the Spire`
  - 浏览器里实际验证了结果页展示的是 `结构化数据：Live` 和实时 LLM 总结
- 已做决策：
  - 当前本地原型阶段，允许“本地服务拉真实公开数据 + 浏览器直连 LLM”
  - 暂时保留 quick case 入口，但它们不再使用 mock 结构化数据作为主分析输入
  - 中文别名识别先使用本地兜底映射，后续再替换成更完整的正式规则
- 新增或修改文件：
  - `prototype/live-steam-data.js`
  - `prototype/server.js`
  - `prototype/app.js`
  - `prototype/index.html`
  - `prototype/smoke-test.mjs`
  - `prototype/README.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 补更多真实字段
  - 调整竞品选择打分
  - 收敛中文别名和模糊搜索规则

### Entry 020

- 日期：2026-05-15
- 本次目标：恢复次日失联的本地原型服务
- 已完成工作：
  - 确认 `127.0.0.1:4173` 当时没有监听，浏览器报 `ERR_CONNECTION_REFUSED`
  - 重新生成了浏览器直连配置文件 `prototype/browser-runtime-config.js`
  - 重新拉起本地原型服务进程
  - 验证首页 `http://127.0.0.1:4173/` 返回 `200`
  - 验证 `/api/status` 返回 `200`
  - 运行 `prototype/smoke-test.mjs`，确认实时识别、实时数据拉取和 live LLM 总结链路都通过
- 已做决策：
  - 当前阶段继续采用“本地服务拉真实公开数据 + 浏览器直连 LLM”的原型运行方式
- 新增或修改文件：
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续补真实字段
  - 继续优化竞品规则

### Entry 021

- 日期：2026-05-15
- 本次目标：修复多候选选择后落入失败页的问题
- 已完成工作：
  - 复现了 `Balatro`、`Hades` 这类多候选输入会先进入候选选择页的路径
  - 修复了候选页点击“选择这款”后仍去旧 mock 集合里找对象的错误逻辑，改为直接从当前 `state.candidateMatches` 中取已解析的 live 候选
  - 在浏览器里实际验证了 `Balatro -> 候选选择 -> 结果页` 和 `Hades -> 候选选择 -> 结果页` 两条链路，确认结果页已正常生成
  - 更新了 `prototype/index.html` 的脚本版本号，强制浏览器刷新前端资源，避免旧缓存继续触发已修复的问题
  - 扩展了 `prototype/smoke-test.mjs` 的输出，让它显式检查多候选解析场景
- 已做决策：
  - 多候选场景以后按“真实候选对象优先”处理，不再依赖任何本地 mock 报表做选择态跳转
  - 前端发生关键交互修复时，同步递增资源版本号，减少浏览器缓存造成的假性复现
- 新增或修改文件：
  - `prototype/app.js`
  - `prototype/index.html`
  - `prototype/smoke-test.mjs`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续补强真实 Steam 数据字段
  - 继续优化竞品筛选与排序规则

### Entry 022

- 日期：2026-05-15
- 本次目标：完成本地敏捷原型的阶段性收口
- 已完成工作：
  - 按最新评审意见，将结果页顺序调整为“目标产品 -> 竞品对比 -> LLM 总结 -> 来源与运行说明”
  - 保持现有真实公开数据拉取、浏览器直连 LLM、多候选选择和错误回退链路不变，只优化信息阅读顺序
  - 将“本地敏捷原型已搭好，可作为下一阶段真实字段扩展与规则优化基础”记为当前里程碑结论
- 已做决策：
  - 当前本地原型阶段到此收口，不继续在这一轮追求更完整的产品形态
  - 下一阶段工作重心转向真实 Steam 字段扩充、竞品筛选规则优化和后续可部署化准备
- 新增或修改文件：
  - `prototype/index.html`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 进入真实字段扩展与规则优化阶段
  - 在后续迭代中继续补开发路线图节点

### Entry 023

- 日期：2026-05-15
- 本次目标：补齐中文游戏名首轮无结果时的 LLM 英文翻译重试链路
- 已完成工作：
  - 在前端搜索主流程中加入“首轮零结果 -> 调用浏览器直连 LLM 翻译英文名 -> 再查一轮”的回退逻辑
  - 将翻译重试限制在包含中文字符且首轮没有命中的场景，避免正常检索被额外放慢
  - 为候选选择页和结果页补充了翻译重试后的提示文案，让研究员知道系统是通过英文名重新命中的
  - 在 `browser-llm.js` 中新增游戏名翻译能力，兼容 `Responses API` 与 `Chat Completions`
  - 扩展 `prototype/smoke-test.mjs`，加入 `环世界 -> RimWorld` 这一类中文名翻译重试的验证输出
  - 更新前端资源版本号，确保浏览器拿到最新脚本
- 已做决策：
  - 翻译重试只作为“零结果兜底”，不进入常规主路径
  - 如果翻译后仍没有结果，前端再向用户明确展示“无结果”，不再继续自动猜测
- 新增或修改文件：
  - `prototype/app.js`
  - `prototype/browser-llm.js`
  - `prototype/smoke-test.mjs`
  - `prototype/index.html`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续扩充中文别名与高频产品映射
  - 在真实字段扩展阶段继续优化竞品规则与错误提示

### Entry 024

- 日期：2026-05-15
- 本次目标：修复《Hollow Knight: Silksong》这类标签缺失产品没有竞品输出的问题
- 已完成工作：
  - 复现并确认《丝之歌》的目标产品命中正常，但 `competitor_candidates` 与 `competitor_games` 都为空
  - 定位到根因是 SteamSpy 对该产品没有返回标签，导致竞品引擎原先直接失去筛选种子
  - 为竞品引擎补上“系列参考作/同开发商参考作标签兜底”策略：当目标产品自身没有 SteamSpy 标签时，优先借用系列参考作的标签来选竞品
  - 为《丝之歌》成功恢复两款竞品输出，当前结果为 `Hollow Knight` 与 `九日`
  - 在自动验证中补充了《丝之歌》竞品数量检查，并重启本地原型服务使后端逻辑生效
- 已做决策：
  - 竞品引擎以后不再把“目标产品缺失 SteamSpy 标签”视为直接失败，而是优先尝试系列/前作兜底
  - 当使用参考作标签时，结果页运行说明中显式写出这次兜底来源，避免研究员误判字段出处
- 新增或修改文件：
  - `prototype/live-steam-data.js`
  - `prototype/smoke-test.mjs`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续提升续作、DLC、原声集等相近产品的候选识别与排除规则
  - 继续优化竞品筛选解释文案

### Entry 025

- 日期：2026-05-15
- 本次目标：开始收尾线上部署前的 UE/UI 微调
- 已完成工作：
  - 将访问页大标题从“输入一个 Steam 游戏名，先看它值不值得研究。”调整为“输入一个 Steam 游戏名，看它值不值得研究。”
  - 保持页面结构、交互路径和其余文案不变，只做本轮确认过的标题口径优化
- 已做决策：
  - 上线前的 UE/UI 优化继续采用“小步快改、逐条确认”的方式推进
- 新增或修改文件：
  - `prototype/index.html`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续按评审意见微调首页与结果页文案
  - 收敛上线前最后一轮可用性细节

### Entry 026

- 日期：2026-05-15
- 本次目标：统一第三方估算字段的展示口径
- 已完成工作：
  - 将结果页主卡片里的“第三方估算”改成更完整的“第三方拥有量估算”
  - 同步调整了结果页说明区和表格里的相关文案，避免前后口径不一致
  - 将说明文案补成“基于 SteamSpy 拥有量区间估算，仅用于判断体量级别”
  - 递增前端资源版本号，确保浏览器拿到最新文案
- 已做决策：
  - 这一组字段后续统一按“拥有量估算”口径展示，比直接写“销量”更符合当前第三方来源的真实含义
- 新增或修改文件：
  - `prototype/index.html`
  - `prototype/app.js`
  - `prototype/live-steam-data.js`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续收口上线前的页面文案与信息层级

### Entry 027

- 日期：2026-05-15
- 本次目标：继续精简结果页里不必要的辅助文案
- 已完成工作：
  - 去掉了“来源分层与运行说明”区块右上角的“评审时一起看”提示胶囊
  - 保留主标题与信息卡片本身，只删除低价值、偏过程感的辅助提示
- 已做决策：
  - 结果页后续继续朝“少解释界面自己、更多直接给信息”的方向收口
- 新增或修改文件：
  - `prototype/index.html`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 继续收口上线前的页面文案与信息层级

## 5. 改动记录

### 2026-05-14

- 新增 PRD
- 新增执行记录
- 新增字段字典
- 新增接口契约
- 明确 SteamDB 为高可信补充源
- 允许第三方估算数据进入主结论，但必须显式标注
- 新增本地 mock 原型
- 将原型重构为单路径搜索体验
- 修复“开始分析无响应”问题
- 新增候选选择页
- 接入真实 LLM 本地分析接口

## 6. 开发路线图快照

### 阶段 1：需求冻结

- 时间：2026-05-15 至 2026-05-18
- 重点：
  - 冻结 V1 范围
  - 冻结字段定义
  - 冻结来源分级
  - 确认验收标准

### 阶段 2：数据层原型

- 时间：2026-05-19 至 2026-05-23
- 重点：
  - 搭建 Steam 数据适配层
  - 定义统一字段结构
  - 增加缓存与来源元信息

### 阶段 3：竞品引擎

- 时间：2026-05-26 至 2026-05-30
- 重点：
  - 建立竞品打分逻辑
  - 生成 5 个候选并选出前 2 个
  - 整合后端返回结构

### 阶段 4：产品页与 LLM 层

- 时间：2026-06-01 至 2026-06-05
- 重点：
  - 搭建搜索与结果页
  - 展示目标产品与竞品对比
  - 接入结构化输入驱动的 LLM 总结

### 阶段 5：QA 与测试环境

- 时间：2026-06-08 至 2026-06-12
- 重点：
  - 校验数据正确性
  - 测试耗时与降级表现
  - 复核 Prompt 安全性

### 阶段 6：试运行与发布准备

- 时间：2026-06-15 至 2026-06-19
- 重点：
  - 小范围内部试用
  - 修复高优问题
  - 准备部署与发布文档

## 7. 下一步任务队列

1. 用户在本地放入 OpenAI 密钥
2. 验证真实 LLM 请求是否稳定
3. 选择第一批真实 Steam 字段并接入
4. 将目标产品拉数替换掉 mock
5. 将竞品选择替换掉 mock

## 8. 更新模板

后续每次记录可复用下面这个模板：

```md
### Entry XXX

- 日期：
- 本次目标：
- 已完成工作：
- 已做决策：
- 新增或修改文件：
- 下一步：
```

### Entry 028

- 日期：2026-05-15
- 本次目标：为浏览器直连 LLM 增加备用网关回退能力，避免主网关异常时整页直接失去实时分析
- 已完成工作：
  - 为浏览器运行时配置新增了 `fallbacks` 结构，支持主网关之外再携带一组备用模型服务
  - 本地配置已补充火山 Ark 备用网关参数，并重新生成了 `browser-runtime-config.js`
  - 浏览器侧 LLM 请求链路已改为按顺序尝试主网关与备用网关，而不是只认单一配置
  - 状态接口和首页连接提示已能识别“存在 1 个备用网关”
  - `.env.example` 已补充备用网关相关环境变量示例
- 已做决策：
  - 主网关继续优先，只有主链路失败时才切备用
  - 备用网关默认按火山 Ark 官方 OpenAI 兼容地址接入
  - 由于当前提供的火山密钥对官方兼容地址返回鉴权格式错误，先保留回退能力，后续等可用密钥或正确接入点再完成真实打通
- 新增或修改文件：
  - `prototype/browser-llm.js`
  - `prototype/server.js`
  - `prototype/sync-browser-runtime-config.mjs`
  - `prototype/.env.local`
  - `prototype/.env.example`
  - `prototype/browser-runtime-config.js`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 刷新原型页面，确认首页状态提示已显示主备配置
  - 如果继续使用火山作为备用，请补一把可通过官方 Ark 兼容地址鉴权的 key，或提供你实际使用的火山接入点与模型名

### Entry 029

- 日期：2026-05-15
- 本次目标：提升竞品比较部分的 LLM prompt，让模型真正解释“为什么是这两个竞品、可比性在哪里”
- 已完成工作：
  - 重写了浏览器直连 LLM 的竞品分析 prompt，不再允许模型只输出“共享标签，所以适合比较”这类泛化表述
  - 明确要求模型对每个竞品输出 `why_compare` 和 `coordinate_role`
  - 明确要求 `why_compare` 至少包含两个事实支点，并尽量引用评论量、当前在线、拥有量估算等量化信息
  - 明确要求模型区分“系列前作基准”和“同赛道外部样本”等参照角色
  - 明确要求 `comparison_frame_summary` 说明这两款竞品各自承担什么坐标系角色
  - 实测 `Hades II` 链路已能输出更具体的竞品说明，例如把 `Hades` 识别为“系列前作基准”，把 `Risk of Rain 2` 识别为“同赛道头部样本”
- 已做决策：
  - 现阶段优先把竞品解释能力交给 prompt 驱动，而不是依赖前端兜底文案
  - 只要模型能稳定输出 `competitor_rationales`，结果页就优先展示模型给出的精准比较理由
- 新增或修改文件：
  - `prototype/browser-llm.js`
  - `prototype/index.html`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 刷新结果页，确认真实页面里竞品卡文案已从泛泛的标签复述升级为更具体的参照解释
  - 如果还不够锋利，再继续细化 prompt 对“量化支点”和“参照角色”的要求

### Entry 030

- 日期：2026-05-15
- 本次目标：完成最后一个里程碑，把原型部署到免费公网域名，同时保证外部访问时不暴露模型密钥
- 已完成工作：
  - 将原型主链路从“浏览器直连模型网关”改成了“服务端安全调用 LLM”，浏览器不再直接持有 API key
  - 将更强的竞品分析 prompt 从浏览器侧搬到了服务端分析模块，保证公网版和本地版输出口径一致
  - 新增了服务端 `translate-query` 接口，保留中文名无结果时的英文翻译重试能力
  - 新增了一体化 `screen` 接口，把“实时拉数 + LLM 分析”压成一次请求，避免免费公网转发时因为中间大 JSON 导致 502
  - 收紧了静态文件暴露范围，公网现在只允许访问首页所需的前端资源，无法直接读取 `.env.local`、`browser-runtime-config.js`、`server.js` 等敏感文件
  - 用免费公网隧道实际发布并验证了可用地址：`https://f8f358d56b907f.lhr.life`
  - 实测公网 `/api/status`、`/api/resolve`、`/api/screen` 都可返回真实结果，其中 `Balatro` 的公网 live 分析已成功通过
- 已做决策：
  - 由于免费匿名隧道无法稳定保留自定义子域名，本轮优先选择“真正可用的免费公网地址”，而不是继续执着于带 `YitingAITest` 的命名
  - 公网返回的 LLM 状态已做脱敏，不再暴露本地磁盘路径和上游网关地址
  - 保留 `localhost.run` 作为当前最稳的免费公网入口；此前试过的其他免费方案要么随机域名不稳，要么长请求不稳定，要么自定义子域名需要注册账号
- 新增或修改文件：
  - `prototype/llm-analysis.js`
  - `prototype/server.js`
  - `prototype/app.js`
  - `prototype/index.html`
  - `prototype/README.md`
  - `prototype/start-public-tunnel.cmd`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 用户醒来后可直接用当前公网地址做外部访问验收
  - 如果后续需要稳定品牌域名，再进入“注册免费平台账号 + 绑定固定子域名或正式域名”的下一阶段

### Entry 031

- 日期：2026-05-15
- 本次目标：把“免费公网隧道可访问”推进到“可切换为常驻免费托管平台”的仓库部署形态
- 已完成工作：
  - 复核了当前环境，确认没有现成的 Cloudflare / Vercel / Netlify 登录态或 API token，因此无法直接在当前会话里替用户完成正式平台发布
  - 评估后选择 Cloudflare Workers 作为下一步正式托管方案，原因是免费、常驻、不依赖本机，并且 `workers.dev` 域名可尽量保留 `YitingAITest` 名称
  - 将 `llm-analysis.js` 改造为可同时接受 Node `process.env` 和 Workers `env bindings`
  - 新增了 [cloudflare/worker.js](<D:\AI测试-何奕廷-高级游戏测评与研究专家\cloudflare\worker.js:1>)，把当前 `/api/status`、`/api/resolve`、`/api/translate-query`、`/api/live-report`、`/api/screen`、`/api/analyze` 全部迁到了 Workers 路由结构
  - 新增了 [wrangler.toml](<D:\AI测试-何奕廷-高级游戏测评与研究专家\wrangler.toml:1>)，默认 Worker 名称为 `yitingaitest-steam-screening`
  - 新增了 [prototype/.assetsignore](<D:\AI测试-何奕廷-高级游戏测评与研究专家\prototype\.assetsignore:1>)，确保将来走 Workers Assets 时不会把敏感文件作为静态资源暴露
  - 整理了 [Cloudflare 部署说明](<D:\AI测试-何奕廷-高级游戏测评与研究专家\docs\steam-screening-cloudflare-worker-deploy.md:1>)，把仓库、Secrets、验收项都写清楚了
- 已做决策：
  - 临时公网入口继续保留作过夜演示使用
  - 正式、常驻、免费、不依赖本机的发布目标改定为 Cloudflare Workers
  - 真正剩下的阻塞点已经不在代码，而在“仓库接入 Cloudflare 并完成平台侧 Secrets 配置”
- 新增或修改文件：
  - `prototype/llm-analysis.js`
  - `cloudflare/worker.js`
  - `wrangler.toml`
  - `prototype/.assetsignore`
  - `prototype/README.md`
  - `docs/steam-screening-cloudflare-worker-deploy.md`
  - `docs/steam-screening-execution-log.md`
- 下一步：
  - 用户创建 GitHub 仓库
  - 将项目推送到仓库
  - 在 Cloudflare 侧连接仓库并填写 Secrets
  - 完成 `yitingaitest-steam-screening.workers.dev` 的首次正式发布
