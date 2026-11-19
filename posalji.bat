@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Una'nin koalasina mesaj gonder
echo.
set /p PORUKA=Mesaj:
node tools\posalji.js
echo.
pause
