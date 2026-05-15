# Steam 产品初筛原型

这套原型当前只保留两条使用路径：

- 本地开发：用 Node 服务跑完整的原型链路
- 正式部署：用 Netlify 托管静态页面和 Serverless Functions

Cloudflare、EdgeOne 和临时隧道方案都已经弃用，不再作为维护目标。

## 本地启动

在 `prototype` 目录下运行：

```bash
node server.js
```

然后访问：

```text
http://127.0.0.1:4173
```

## 当前主链路

1. 输入游戏名
2. 系统识别对应 Steam 产品
3. 如果首轮无结果且输入包含中文，会先做一次英文名翻译重试
4. 后端实时拉取目标产品与竞品的公开字段
5. 后端生成结构化结果并请求 LLM 输出初筛结论
6. 页面展示目标产品、竞品坐标系、对比结果和来源说明

## 数据来源

当前主链路使用的公开来源包括：

- Steam Store `appdetails`
- Steam Reviews `appreviews`
- Steam Current Players
- SteamSpy `appdetails`
- Steam Store 搜索建议

`mock-data.js` 只保留给首页快捷样例和回归验证，不再承担正式分析主链路。

## 环境变量

服务端读取本地环境变量文件：

```text
prototype/.env.local
```

当前支持：

- 主网关：`OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL`
- 备用网关：`VOLCENGINE_API_KEY` / `VOLCENGINE_BASE_URL` / `VOLCENGINE_MODEL`

前端不会直接读取这些值。

## 正式部署

当前正式部署只保留 Netlify。

- 部署说明见 [Netlify 部署文档](../docs/steam-screening-netlify-deploy.md)
- 站点构建配置见 [netlify.toml](../netlify.toml)
- 构建脚本见 [build-netlify.mjs](../scripts/build-netlify.mjs)

## 本地验证

这套原型至少应满足：

- 首页可访问
- `/api/status`
- `/api/resolve`
- `/api/translate-query`
- `/api/screen`

都能正常返回
