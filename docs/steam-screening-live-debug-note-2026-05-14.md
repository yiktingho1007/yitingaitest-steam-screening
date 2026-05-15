# Steam 产品初筛原型 Live 联调记录

日期：2026-05-14

## 本次目标

- 验证用户提供的模型网关 `https://ai.shukelongda.cn/v1` 是否可用
- 验证当前本地密钥是否能真实请求模型
- 定位为什么结果页仍然自动回退到 mock 总结

## 已确认结论

1. 网关和密钥本身可用
   - `/models` 探测成功返回 `200`
   - 返回的模型列表里包含 `gpt-5.4-mini`

2. 当前模型可用
   - `gpt-5.4-mini` 通过 `chat/completions` 探测成功返回 `200`
   - 返回内容为标准 OpenAI 兼容格式

3. 原型代码本身可用
   - 用 shell 临时拉起本地服务后，请求 `/api/analyze`
   - 返回结果为：
     - `analysis_mode: live`
     - `provider: responses`
     - `error: null`

4. 当前阻塞点不在网关，也不在密钥
   - 阻塞点在于 Codex 当前常驻本地服务所在运行环境
   - 该环境对 `103.201.130.161:443` 返回 `EACCES`
   - 因此页面里的常驻服务会自动回退到 mock

## 本次新增工具

- `prototype/gateway-probe.mjs`
  - 用于直接探测网关 `/models` 和 `/chat/completions`
  - 支持自定义超时

- `prototype/start-prototype-server.cmd`
  - 本地直接启动原型服务的命令入口

- `prototype/start-prototype-server.vbs`
  - 本地静默启动原型服务的脚本入口

- `prototype/package.json`
  - 新增：
    - `npm run probe:models`
    - `npm run probe:chat`

## 关键实验记录

### 实验 A：网关模型列表探测

- 命令：`node prototype/gateway-probe.mjs models`
- 结果：成功
- 结论：网关和密钥可用

### 实验 B：聊天接口探测

- 命令：`node prototype/gateway-probe.mjs chat 20000`
- 结果：成功
- 结论：`gpt-5.4-mini` 可以通过当前网关真实返回结果

### 实验 C：临时本地服务 + /api/analyze`

- 启动方式：shell 临时启动本地服务
- 结果：`analysis_mode: live`
- 结论：当前后端逻辑可以真实产出 live 结果

### 实验 D：当前页面常驻服务

- 结果：仍然回退到 mock
- 错误细节：`connect EACCES 103.201.130.161:443`
- 结论：当前常驻服务所在运行环境被限制出站访问

## 当前判断

当前问题已经不是“产品代码不会调模型”，而是“当前常驻服务进程跑在一个被限制外连的运行环境里”。

换句话说：

- 网关没问题
- 密钥没问题
- 模型没问题
- `/api/analyze` 逻辑没问题
- 真正的问题是：当前挂在 `127.0.0.1:4173` 的常驻服务进程无法稳定运行在有外网权限的环境中

## 建议的下一步

1. 将常驻原型服务切换到普通本地终端/本地脚本启动，而不是当前受限常驻环境
2. 在不暴露密钥到前端的前提下，继续保持“后端持钥、前端只请求本地服务”的架构
3. 等常驻服务启动环境固定后，再继续接真实 Steam 数据源
