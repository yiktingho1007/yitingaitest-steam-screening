# Steam 初筛工具 Cloudflare Workers 部署说明

## 目标

把当前原型从“临时公网隧道”切换到真正常驻的免费托管平台，并尽量保留带 `YitingAITest` 的域名特征。

当前推荐目标：

```text
https://yitingaitest-steam-screening.workers.dev
```

说明：

- 这个域名来自 `wrangler.toml` 里的 Worker 名称
- 只要 Cloudflare 账号里这个名称可用，就能直接保留 `YitingAITest` 这一段
- 它不依赖本机或本地隧道持续在线

## 已经准备好的文件

- [wrangler.toml](<D:\AI测试-何奕廷-高级游戏测评与研究专家\wrangler.toml:1>)
- [cloudflare/worker.js](<D:\AI测试-何奕廷-高级游戏测评与研究专家\cloudflare\worker.js:1>)
- [prototype/.assetsignore](<D:\AI测试-何奕廷-高级游戏测评与研究专家\prototype\.assetsignore:1>)

这些文件已经把当前原型整理成 Cloudflare Workers 可接仓库部署的形态：

- 静态页面资源由 Workers Assets 提供
- `/api/*` 请求由 Worker 处理
- 前端不再直接持有模型密钥
- 敏感文件不会作为静态资源暴露

## 需要用户提供的条件

1. 一个 GitHub 仓库
2. 一个 Cloudflare 账号
3. Cloudflare 中配置以下环境变量 / Secrets

主模型网关：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_REASONING_EFFORT`

备用网关，可选：

- `VOLCENGINE_API_KEY`
- `VOLCENGINE_BASE_URL`
- `VOLCENGINE_MODEL`
- `VOLCENGINE_REASONING_EFFORT`

## 推荐部署路径

### 方案 A：Cloudflare 仓库直连

1. 创建 GitHub 仓库，并把当前项目推上去
2. 在 Cloudflare Dashboard 打开 Workers
3. 选择 Git integration / Connect repository
4. 选中这个仓库
5. 保持根目录为仓库根目录
6. 确认 Cloudflare 读取 [wrangler.toml](<D:\AI测试-何奕廷-高级游戏测评与研究专家\wrangler.toml:1>)
7. 在 Dashboard 里填入上面的 Secrets
8. 触发首次部署

### 方案 B：Wrangler CLI 部署

如果后面本机装了 `git` 和 `wrangler`，也可以直接本地部署：

1. 登录 Cloudflare
2. 进入仓库根目录
3. 执行部署

## 发布后验收

至少检查这几项：

1. 首页能打开
2. `api/status` 返回 `configured: true`
3. 输入 `Balatro` 能返回 live 结果
4. 输入中文名如 `环世界` 能触发英文重试
5. 直接访问以下路径应返回 404，而不是敏感内容

- `/browser-runtime-config.js`
- `/.env.local`
- `/server.js`

## 当前状态

截至 2026-05-15，这一部分还没有真正发到 Cloudflare。

真正还差的不是代码，而是：

- GitHub 仓库
- Cloudflare 账号里的仓库连接
- Secrets 填写

也就是说，这已经从“开发问题”收缩成了“上线操作问题”。
