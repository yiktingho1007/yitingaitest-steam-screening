# Steam 产品初筛原型

这版原型当前已经切成适合公网暴露的安全形态：

- 本地服务实时拉真实 Steam 公开数据
- 服务端代表网页去请求 LLM
- 浏览器不再直接持有模型密钥
- 公网静态访问已禁止读取 `.env.local`、`browser-runtime-config.js`、`server.js` 等敏感文件

当前用户路径是：

1. 输入游戏名
2. 系统识别对应 Steam 产品
3. 如果首轮没有结果，且输入里含中文，会先做一次英文名翻译重试
4. 后端实时拉取目标产品和两款竞品的公开字段
5. 后端一次性完成结构化分析与 LLM 总结
6. 页面展示目标产品、竞品坐标系、对比结果和来源说明

## 本地启动

在 `prototype` 目录下运行：

```bash
node server.js
```

然后访问：

```text
http://127.0.0.1:4173
```

## 当前公网地址

当前这轮免费公网发布使用的是 `localhost.run`：

```text
https://f8f358d56b907f.lhr.life
```

说明：

- 这是已验证可用的外网地址
- 它是免费匿名隧道，所以域名是随机生成的
- 我尝试过争取包含 `YitingAITest` 的免费子域名，但稳定的免费方案都需要注册账号或保留域名，不符合“免费直接可用”这个约束

## 正式托管推荐

如果要摆脱“依赖当前机器和隧道进程持续在线”，当前推荐的正式免费方案是：

```text
Cloudflare Workers
```

我已经把仓库部署所需的骨架准备好了：

- [wrangler.toml](<D:\AI测试-何奕廷-高级游戏测评与研究专家\wrangler.toml:1>)
- [cloudflare/worker.js](<D:\AI测试-何奕廷-高级游戏测评与研究专家\cloudflare\worker.js:1>)
- [部署说明](<D:\AI测试-何奕廷-高级游戏测评与研究专家\docs\steam-screening-cloudflare-worker-deploy.md:1>)

只要你把仓库建好并接到 Cloudflare，这套项目就可以走一个固定的 `workers.dev` 域名。按当前配置，目标名字就是：

```text
https://yitingaitest-steam-screening.workers.dev
```

## 一键重开公网入口

如果这条免费公网地址失效，可以运行：

```text
prototype/start-public-tunnel.cmd
```

它会重新打开一条 `localhost.run` 免费公网入口，并在窗口里打印新的外网地址。保持那个窗口不要关闭即可。

## 当前数据来源

目标产品和竞品的结构化字段目前来自这些公开来源：

- Steam Store `appdetails`
- Steam Reviews `appreviews`
- Steam Current Players
- SteamSpy `appdetails`
- Steam Store 搜索建议

当前这一版已经不再依赖 mock 结构化数据作为主链路；mock 数据只保留给首页快捷样例与回归验证。

## 密钥与网关配置

服务端配置来自：

```text
prototype/.env.local
```

当前支持：

- 主网关：`OPENAI_API_KEY` / `OPENAI_BASE_URL`
- 备用网关：`VOLCENGINE_API_KEY` / `VOLCENGINE_BASE_URL`

前端不会再直接读取这些值。

## 本地验证

这轮里程碑已经验证过：

- 本地首页可访问
- `/api/status`、`/api/resolve`、`/api/translate-query`、`/api/screen` 正常
- 公网首页可访问
- 公网接口可返回真实 `live` 分析结果
- 公网无法直接读取敏感配置文件

## 当前限制

- 免费公网域名是随机的，不保证永久不变
- 这条公网入口依赖当前机器和隧道进程持续在线
- 竞品选择规则已经可用，但还可以继续做更细的行业化调优
