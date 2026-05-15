# Steam 初筛工具 Netlify 部署说明

## 为什么切到 Netlify

这次切换的目标不是承诺中国大陆一定稳定，而是避开 EdgeOne 项目域名在中国大陆访问时由平台直接返回 `401` 的规则。

Netlify 这条线的特点是：

- 支持 GitHub 自动部署
- 支持静态页面 + Node 函数
- 官方文档支持通过 `netlify.toml` 配置发布目录和函数目录
- 没有像 EdgeOne 项目域名那样公开写明“中国大陆直接返回 401”的平台规则

上面最后一点是基于官方文档缺失此类限制的推断，不是可用性保证。

## 仓库内新增内容

- [netlify.toml](/F:/yitingaitest-steam-screening/netlify.toml)
- [scripts/build-netlify.mjs](/F:/yitingaitest-steam-screening/scripts/build-netlify.mjs)
- [netlify/functions/status.js](/F:/yitingaitest-steam-screening/netlify/functions/status.js)

## 部署方法

1. 打开 Netlify
2. 选择 `Add new site` -> `Import an existing project`
3. 连接 GitHub
4. 选择仓库 `yiktingho1007/yitingaitest-steam-screening`
5. 保持它读取仓库里的 [netlify.toml](/F:/yitingaitest-steam-screening/netlify.toml)
6. 在站点环境变量里配置：

```env
OPENAI_API_KEY=你的渠道 key
OPENAI_BASE_URL=https://ai.shukelongda.cn/v1
OPENAI_MODEL=你的模型名
OPENAI_REASONING_EFFORT=low
```

7. 点击部署

## 上线后检查

先打开首页，再访问：

`/api/status?probe=1`

如果返回：

- `configured: true`
- `reachable: true`

说明服务端 LLM 已正常连通。

## 相关官方文档

- [Netlify file-based configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Netlify functions get started](https://docs.netlify.com/functions/get-started/)
- [Netlify environment variables and functions](https://docs.netlify.com/functions/environment-variables/)
