@echo off
REM ============================================================================
REM H Karate v0.6 — Development Run Script
REM Starts the app in dev mode with DevTools
REM ============================================================================

echo.
echo ======================================
echo H Karate v0.6 — Development Mode
echo ======================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
    echo.
)

echo Starting H Karate in development mode...
echo Press Ctrl+C to stop the app
echo.

REM Run in dev mode (opens DevTools)
call npm run dev
