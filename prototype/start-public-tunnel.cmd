@echo off
setlocal
cd /d "%~dp0"
echo Starting public tunnel for http://127.0.0.1:4173 ...
echo When localhost.run prints a public URL, keep this window open.
ssh -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -R 80:localhost:4173 nokey@localhost.run
