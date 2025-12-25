@echo off
REM Procurement System - Self-Updating Desktop App
title Procurement System - Desktop App

echo ==========================================
echo    PROCUREMENT SYSTEM - DESKTOP APP
echo ==========================================
echo.
echo Starting self-updating desktop application...
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

REM Check if this is a git repository
if not exist ".git" (
    echo WARNING: Not a git repository - auto-updates will be disabled.
    echo.
    timeout /t 3
)

echo Installing/updating dependencies...
call npm install

echo.
echo Launching Procurement System Desktop App...
echo.
echo FEATURES:
echo - 🔄 Automatic updates from git repository
echo - 💻 Native desktop experience  
echo - 🚀 Fast, responsive interface
echo - 📱 Always shows latest version
echo.

npm run desktop