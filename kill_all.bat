@echo off
taskkill /IM python.exe /F
taskkill /IM powershell.exe /F
taskkill /IM cmd.exe /F
timeout /t 2
echo All processes killed
pause
