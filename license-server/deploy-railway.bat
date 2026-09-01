@echo off
REM ============================================================================
REM H Karate License Server — Railway Deployment Script
REM ============================================================================

echo.
echo ======================================
echo H Karate License Server
echo Railway Deployment
echo ======================================
echo.

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Railway CLI not found. Installing...
    call npm install -g @railway/cli
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install Railway CLI
        pause
        exit /b 1
    )
)

echo Step 1: Login to Railway
echo.
echo This will open your browser. Sign in with GitHub.
echo.
pause
railway login

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Login failed
    pause
    exit /b 1
)

echo.
echo Step 2: Initialize Railway Project
echo.
railway init

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Project initialization failed
    pause
    exit /b 1
)

echo.
echo Step 3: Deploying to Railway...
echo.
railway up

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Set environment variables:
echo.
echo    Generate admin secret:
for /f %%i in ('powershell -Command "[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))"') do set ADMIN_SECRET=%%i
echo    railway variables set ADMIN_SECRET="%ADMIN_SECRET%"
echo.
echo    Set private key (copy from keys.json):
echo    railway variables set PRIVATE_KEY="<paste-full-key-here>"
echo.
echo 2. Get your server URL:
echo    railway domain
echo.
echo 3. Update validator.js line 26 with your Railway URL
echo.
echo 4. Rebuild the app:
echo    cd ..\.. 
echo    npm run build
echo.
pause
