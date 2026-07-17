@echo off
echo ========================================
echo   网吧用户端启动
echo ========================================
echo.

cd /d "%~dp0"

echo 安装依赖...
call pnpm install

echo.
echo 启动用户端...
call pnpm run dev
