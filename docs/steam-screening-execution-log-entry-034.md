# Entry 034

- 日期：2026-05-15
- 本次目标：清理废弃部署链路，只保留 Netlify 作为正式上线方案。
- 已完成工作：
  - 删除了 Cloudflare Workers、EdgeOne 和对应的构建与部署配置。
  - 删除了旧的 Cloudflare GitHub Actions 发布工作流。
  - 更新了仓库根目录脚本入口，只保留 Netlify 构建命令。
  - 重写了原型 README 和 Netlify 部署文档，移除了历史隧道与失效本机路径。
  - 将公网部署结果说明改成 Netlify 单一路径口径，避免继续引用历史 Cloudflare 地址。
- 当前结论：
  - 仓库正式部署主线只剩 Netlify。
  - 历史探索记录仍保留在执行日志中，但不再作为当前部署方案。
