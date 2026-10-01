@echo off
setlocal EnableDelayedExpansion
REM ============================================
REM  OpenClaw U盘便携版 · 启动脚本 v2.0 (开源套件版)
REM  插上U盘 → 双击本文件即可使用
REM  本体来源：OpenClaw 官方 Release + portable-openclaw-kit
REM ============================================
set "ROOT=%~dp0"
REM ---- 清洗本机其他软件注入的 OpenClaw 环境变量 ----
REM ---- （防止状态目录被劫持，确保数据都在U盘上）----
set "OPENCLAW_HOME="
set "OPENCLAW_STATE_DIR="
set "OPENCLAW_CONFIG_PATH="
set "OPENCLAW_CONTAINER="
set "OPENCLAW_PROFILE="
set "CLAWDBOT_STATE_DIR="
REM ---- 便携化：全部状态写入 U 盘 data 目录 ----
set "OPENCLAW_HOME=%ROOT%data"
set "PATH=%ROOT%runtime\node;%PATH%"
REM ---- 预装文档生成库（Excel/PPT/Word 免联网直出）----
set "NODE_PATH=%ROOT%app\node_modules;%ROOT%data\.openclaw\workspace\node_modules"
REM ---- 稳定性冻结：永久禁止自动更新 ----
set "OPENCLAW_NO_AUTO_UPDATE=1"
cd /d "%ROOT%app"
set "OC=%ROOT%app\node_modules\.bin\openclaw.cmd"
if not exist "%OC%" (
    echo [错误] 未找到 OpenClaw 本体
    echo 请先按《组装说明书.md》把 OpenClaw 解压到 U 盘根目录。
    pause
    exit /b 1
)
REM ---- 首次运行：进入初始化向导（录入你自己的模型 API key）----
if not exist "%ROOT%data\.openclaw\openclaw.json" (
    echo ==========================================
    echo  首次运行，进入初始化向导...
    echo  请按提示录入模型 API key（推荐 DeepSeek 或 Kimi）
    echo ==========================================
    call "%OC%" onboard
)
REM ---- 便携性修复：workspace 写成占位符，换盘符自动跟随 ----
call "%OC%" config set agents.defaults.workspace "${OPENCLAW_HOME}/.openclaw/workspace" > "%TMP%OCW.tmp" 2>&1 & del /q "%TMP%OCW.tmp"
REM ---- 同步离线助手路径到当前盘符（插哪台电脑都能用）----
if exist "%ROOT%offline-assistant\patch-path.cjs" (
    "%ROOT%runtime\node\node.exe" "%ROOT%offline-assistant\patch-path.cjs" "%ROOT%"
)
REM ---- 后台（最小化窗口）启动网关 ----
start "OpenClawGateway" /min "%OC%" gateway run
REM ---- 等待网关就绪（首次启动约需 1~2 分钟，请耐心等待）----
echo.
echo 正在启动网关，首次运行可能需要 1~2 分钟，请稍候...
set /a TRY=0
:WAIT
set /a TRY+=1
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1',18789)).Close(); exit 0 } catch { exit 1 }" > "%TMP%OCW.tmp" 2>&1 & del /q "%TMP%OCW.tmp"
if %errorlevel%==0 goto READY
if %TRY% GTR 90 goto TIMEOUT
ping -n 3 127.0.0.1 > "%TMP%OCW.tmp" 2>&1 & del /q "%TMP%OCW.tmp"
goto WAIT
:TIMEOUT
echo [提示] 网关启动超时。请查看最小化的 OpenClawGateway 窗口里的错误信息，
echo        常见原因：电脑上已开着另一个 OpenClaw，或杀毒软件拦截。
echo        可先关掉 OpenClawGateway 窗口再重新双击本脚本。
exit /b 1
:READY
REM ---- 打开控制台网页（自动携带登录令牌，无需手动输入）----
call "%OC%" dashboard
echo.
echo 启动完成！浏览器已打开控制台。
echo 网关正在最小化的 OpenClawGateway 窗口中运行，
echo 关闭那个窗口即可停止服务（数据都在U盘上，不会丢）。
echo.
pause
endlocal
