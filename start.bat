@echo off
title ESL Hub (keep this window open)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 -Open admin.html
pause
