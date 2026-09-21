@echo off
title Homzo2 - Sync to GitHub
set PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\mingw64\bin;%PATH%
cd /d "%~dp0"

echo ========================================================
echo          HOMZO2 - SYNC TO GITHUB
echo ========================================================
echo.
echo Changes ko GitHub par upload kiya ja raha hai...
echo.
git add .
git commit -m "Auto update via Sync script"
git push origin main
echo.
echo ========================================================
echo   Done! Saara code GitHub par upload ho chuka hai.
echo ========================================================
echo.
pause
