@echo off
title RankAce - 1-Click Local Studio Launcher
cd /d "%~dp0"
echo ======================================================
echo   Starting RankAce (Web App + API + Chrome Studio)
echo ======================================================
echo.
node "%~dp0scripts\launch-rankace.mjs"
if errorlevel 1 (
  echo.
  echo RankAce launcher encountered an error. Press any key to exit.
  pause >nul
)
