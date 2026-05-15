# Steam 初筛工具 EdgeOne Pages 部署说明

## 当前迁移结果

仓库已经补齐了 EdgeOne Pages 所需的最小结构：

- 静态页面仍然来自 `prototype`
- API 已迁移到 `cloud-functions/api`
- 构建脚本会产出干净的 `dist` 目录，避免把本地脚本和调试文件暴露到公网
- 默认云函数区域已配置为 `ap-hongkong`

关键文件：

- [edgeone.json](/F:/yitingaitest-steam-screening/edgeone.json)
- [package.json](/F:/yitingaitest-steam-screening/package.json)
- [scripts/build-edgeone.mjs](/F:/yitingaitest-steam-screening/scripts/build-edgeone.mjs)
- [cloud-functions/api/status.js](/F:/yitingaitest-steam-screening/cloud-functions/api/status.js)

## 适用目标

这套配置对应的是：

- 不备案
- 先直接上线
- 优先争取中国大陆可访问性
- 使用 EdgeOne Pages 免费方案

注意：

- 如果后续要绑定自定义域名并选择“含中国大陆”的加速区域，官方文档要求备案
- 当前配置刻意使用香港云函数区域，避免落到必须备案的大陆方案

## 环境变量

在 EdgeOne Pages 控制台里配置这些环境变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_REASONING_EFFORT`

可选备用：

- `VOLCENGINE_API_KEY`
- `VOLCENGINE_BASE_URL`
- `VOLCENGINE_MODEL`
- `VOLCENGINE_REASONING_EFFORT`

## 部署方式

### 方案 A：连接 GitHub 仓库自动部署

1. 在 EdgeOne Pages 创建项目
2. 连接这个 GitHub 仓库
3. 保持项目根目录为仓库根目录
4. 让平台读取 [edgeone.json](/F:/yitingaitest-steam-screening/edgeone.json)
5. 在控制台补齐环境变量
6. 触发首次部署

### 方案 B：本地 CLI 直接部署

先安装官方 CLI：

```bash
npm install -g edgeone
```

然后登录并部署：

```bash
edgeone login
npm run build:edgeone
edgeone pages deploy ./dist -n yitingaitest-steam-screening
```

## 本地验证

本地先验证构建产物：

```bash
npm run build:edgeone
```

构建成功后，`dist` 目录里应该至少有：

- `index.html`
- `styles.css`
- `app.js`
- `mock-data.js`
- `cloud-functions/`

## 上线后检查

至少检查这几项：

1. 首页可打开
2. `/api/status?probe=1` 可返回 JSON
3. 返回值里 `configured` 是否为 `true`
4. 如果 `configured: true` 但 `reachable: false`，说明是模型网关连通性问题，不是前端问题
5. 输入 `Balatro` 能否返回 live 结果

## 当前建议

第一阶段先直接用 EdgeOne 分配的项目域名验证是否能从中国大陆访问。

等确认访问和 API 都正常后，再决定是否继续折腾自定义域名。
