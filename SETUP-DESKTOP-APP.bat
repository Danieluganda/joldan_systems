@echo off
REM Setup Self-Updating Desktop App
title Procurement System - Setup

echo ==========================================
echo    PROCUREMENT SYSTEM - SETUP
echo ==========================================
echo.
echo Setting up self-updating desktop app...
echo Repository: https://github.com/Danieluganda/joldan_systems
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

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js and Git are available
echo.

REM Initialize or verify git repository
if not exist ".git" (
    echo Initializing git repository...
    git init
    git remote add origin https://github.com/Danieluganda/joldan_systems.git
    git fetch origin main
    git checkout -b main origin/main
    echo ✅ Git repository initialized
) else (
    echo Verifying git configuration...
    git remote set-url origin https://github.com/Danieluganda/joldan_systems.git
    git fetch origin main
    echo ✅ Git repository verified
)

echo.
echo Installing dependencies...
call npm install

echo.
echo Installing client dependencies...
cd client
call npm install
cd ..

echo.
echo Installing server dependencies...
cd server  
call npm install
cd ..

echo.
echo ==========================================
echo    SETUP COMPLETE!
echo ==========================================
echo.
echo You can now:
echo 1. Run desktop app:     START-DESKTOP-APP.bat
echo 2. Build installer:     npm run pack-win
echo 3. Test updates:        Push to GitHub and wait 1 minute
echo.
echo The app will auto-update from:
echo https://github.com/Danieluganda/joldan_systems
echo.
pause