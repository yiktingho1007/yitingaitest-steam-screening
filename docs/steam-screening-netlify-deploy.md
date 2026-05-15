# Steam 初筛工具 Netlify 部署说明

## 当前口径

这套项目现在只保留 Netlify 作为正式部署路径。

- EdgeOne 已弃用
- Cloudflare Workers 已弃用
- 本机临时隧道只用于历史调试，不再作为发布方案

## 仓库内关键文件

- [netlify.toml](../netlify.toml)
- [scripts/build-netlify.mjs](../scripts/build-netlify.mjs)
- [netlify/functions/status.js](../netlify/functions/status.js)
- [netlify/functions/screen.js](../netlify/functions/screen.js)

## 为什么选 Netlify

当前保留 Netlify 的原因很直接：

- 支持 GitHub 自动部署
- 支持静态页面加 Node Functions
- 当前仓库已经补齐对应的函数入口和构建脚本

## 部署步骤

1. 打开 Netlify
2. 选择 `Add new site` -> `Import an existing project`
3. 连接 GitHub
4. 选择仓库 `yiktingho1007/yitingaitest-steam-screening`
5. 保持它读取仓库里的 [netlify.toml](../netlify.toml)
6. 在站点环境变量里配置以下值：

```env
OPENAI_API_KEY=你的渠道 key
OPENAI_BASE_URL=https://ai.shukelongda.cn/v1
OPENAI_MODEL=你的模型名
OPENAI_REASONING_EFFORT=low
VOLCENGINE_API_KEY=可选备用 key
VOLCENGINE_BASE_URL=可选备用 base url
VOLCENGINE_MODEL=可选备用模型名
VOLCENGINE_REASONING_EFFORT=low
```

7. 点击部署

## 本地构建验证

在仓库根目录运行：

```bash
node scripts/build-netlify.mjs
```

或者：

```bash
npm run build
```

构建后 `dist` 目录里应至少有：

- `index.html`
- `styles.css`
- `app.js`
- `mock-data.js`

## 上线后检查

至少检查这几项：

1. 首页能打开
2. `/api/status?probe=1` 返回 JSON
3. 返回值里 `configured` 是 `true`
4. 如果 `reachable` 是 `false`，优先排查模型网关连通性
5. 输入 `Balatro` 能返回 live 结果

## 官方文档

- [Netlify file-based configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Netlify functions get started](https://docs.netlify.com/functions/get-started/)
- [Netlify environment variables and functions](https://docs.netlify.com/functions/environment-variables/)
