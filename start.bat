@echo off
chcp 65001 >nul
title Dog-Diary

cd /d "%~dp0"

echo.
echo    🐶  Dog-Diary — Local Diary Workbench
echo    ─────────────────────────────────────
echo.

:: Check node_modules
if not exist "node_modules\" (
    echo    [1/2] 安装依赖中...
    call npm install
    if %errorlevel% neq 0 (
        echo    ❌ 依赖安装失败，请检查 Node.js 是否已安装
        pause
        exit /b 1
    )
) else (
    echo    [1/2] 依赖已安装 ✓
)

echo    [2/2] 启动开发服务器...
echo.
echo    打开浏览器访问 → http://localhost:3000
echo    按 Ctrl+C 停止服务器
echo.

:: Open browser after a short delay
start "" http://localhost:3000

npm run dev
pause
