@echo off
REM Procurement System - Desktop App (No Git Version)
title Procurement System - Desktop App

echo ==========================================
echo    PROCUREMENT SYSTEM - DESKTOP APP
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js is available
echo.

REM Check for Git (needed for auto-updates)
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  WARNING: Git is not installed
    echo Auto-updates will be disabled
    echo To enable auto-updates, install Git from: https://git-scm.com
    echo.
    echo Continuing with desktop app (manual updates only)...
    timeout /t 5
) else (
    echo ✅ Git is available - auto-updates enabled
)

echo.
echo Installing/updating dependencies...
call npm install

echo.
echo Starting Procurement System Desktop App...
echo.
echo FEATURES:
echo - 💻 Native desktop experience  
echo - 🚀 Fast, responsive interface
if exist ".git" (
    echo - 🔄 Auto-updates enabled
) else (
    echo - ⚠️  Auto-updates disabled (no git)
)
echo.

npm run desktop