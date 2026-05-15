param(
  [int]$Port = 4192
)

$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot
$env:PORT = [string]$Port

Write-Host ""
Write-Host "Steam 产品初筛原型服务已启动" -ForegroundColor Green
Write-Host "本地地址: http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 可停止服务。" -ForegroundColor DarkGray
Write-Host ""

node server.js
