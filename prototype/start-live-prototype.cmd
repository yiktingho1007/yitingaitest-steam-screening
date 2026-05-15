@echo off
setlocal

set "PORT_ARG=%~1"
if "%PORT_ARG%"=="" set "PORT_ARG=4192"

start "Steam Live Prototype" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-live-server.ps1" %PORT_ARG%
