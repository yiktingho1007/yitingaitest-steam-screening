@echo off
setlocal

if not "%~1"=="" (
  set "PORT=%~1"
)

cd /d "%~dp0"
node server.js
