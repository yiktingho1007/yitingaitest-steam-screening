# 本地 Live 模式说明

日期：2026-05-14

## 目的

这个说明只解决一件事：

让原型在“普通本地环境”里跑，而不是依赖当前 Codex 受限常驻后端。

## 为什么需要这个模式

本次联调已经确认：

- 网关 `https://ai.shukelongda.cn/v1` 可用
- 本地密钥可用
- `gpt-5.4-mini` 可正常返回
- 同一套 `/api/analyze` 逻辑在普通本地 shell 临时服务里可以返回 `analysis_mode: live`

当前浏览器页之所以还会回退到 mock，是因为挂在 `127.0.0.1:4173` 的那份常驻服务运行在受限环境里，访问外网时会报：

```text
connect EACCES 103.201.130.161:443
```

所以这不是模型或 key 的问题，而是后端运行环境的问题。

## 已提供的本地启动入口

- [run-live-server.ps1](<D:\AI测试-何奕廷-高级游戏测评与研究专家\prototype\run-live-server.ps1:1>)
- [start-live-prototype.cmd](<D:\AI测试-何奕廷-高级游戏测评与研究专家\prototype\start-live-prototype.cmd:1>)

## 建议使用方式

优先使用：

```text
prototype/start-live-prototype.cmd
```

它会在普通本地 PowerShell 窗口中启动服务，默认端口为 `4173`。

如果要换端口，可以传一个端口号，例如：

```text
prototype/start-live-prototype.cmd 4192
```

## 已加入的辅助命令

在 [package.json](<D:\AI测试-何奕廷-高级游戏测评与研究专家\prototype\package.json:1>) 中新增了：

- `npm run start:live-window`
- `npm run probe:models`
- `npm run probe:chat`

其中：

- `probe:models` 用于验证网关鉴权和模型列表
- `probe:chat` 用于验证当前模型是否可真实返回

## 当前结论

产品原型的“真实 LLM 能力”已经验证通过。

现在剩下的，不是 prompt 或接口逻辑问题，而是要把浏览器正在访问的那份本地后端，切换到一个真正不受限的普通本地运行环境中。
