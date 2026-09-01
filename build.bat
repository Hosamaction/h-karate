@echo off
REM ============================================================================
REM H Karate v0.6 — Build Script
REM Creates Windows installer and portable executable
REM ============================================================================

echo.
echo ======================================
echo H Karate v0.6 — Build
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

echo Building H Karate...
echo.
echo This will create:
echo   - dist\H-Karate-Scoring-Setup-0.6.0.exe  (Installer)
echo   - dist\H-Karate-Scoring-v0.6.0-portable.exe  (Portable)
echo.

REM Disable code signing
set CSC_IDENTITY_AUTO_DISCOVERY=false

REM Run build
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo.
    echo Check the error messages above.
    echo Common issues:
    echo   - Missing dependencies: Run 'npm install'
    echo   - Invalid package.json: Check syntax
    echo   - Out of disk space
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Output files:
dir dist\*.exe /b 2>nul
echo.
echo Next steps:
echo   1. Test the installers on a clean Windows machine
echo   2. Create a GitHub release and upload both .exe files
echo   3. Update download links on the website
echo.
echo See BUILD-CHECKLIST.md for full deployment guide.
echo.
pause
