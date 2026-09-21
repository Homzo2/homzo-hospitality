@echo off
title Homzo2 - GitHub Login
set PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\mingw64\bin;%PATH%
cd /d "%~dp0"

echo ========================================================
echo          HOMZO2 - ONE-TIME GITHUB LOGIN
echo ========================================================
echo.
echo Abhi aapke browser mein ek page khulega.
echo Bas wahan "Sign in with browser" / "Authorize" par click karein...
echo.
git-credential-manager github login
echo.
echo ========================================================
echo   Awesome! Login Successful! Ab aap ise band kar sakte hain.
echo ========================================================
echo.
pause
