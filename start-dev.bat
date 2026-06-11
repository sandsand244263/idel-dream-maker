@echo off
chcp 65001 >nul
echo [Idel-DreamMaker] 清理旧进程...

taskkill /f /im idel-dream-maker.exe 2>nul
taskkill /f /im cargo.exe 2>nul

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":1420" ^| findstr "LISTENING"') do (
  taskkill /f /pid %%a 2>nul
)

timeout /t 1 /nobreak >nul
echo [Idel-DreamMaker] 启动...
npm run tauri dev
pause
