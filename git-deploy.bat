@echo off
REM ============================================================================
REM H Karate v0.6 — GitHub Deployment Script
REM Creates repo, commits code, pushes, and creates release tag
REM ============================================================================

echo.
echo ======================================
echo H Karate v0.6
echo GitHub Deployment
echo ======================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git not found. Install from https://git-scm.com
    pause
    exit /b 1
)

echo Have you created the GitHub repository 'h-karate'?
echo Go to: https://github.com/new
echo.
echo Press any key when ready...
pause >nul

echo.
echo Step 1: Initialize Git Repository
echo.
git init

if %ERRORLEVEL% NEQ 0 (
    echo Git init failed
    pause
    exit /b 1
)

echo.
echo Step 2: Add Files
echo.
git add .

echo.
echo Step 3: Create Commit
echo.
git commit -m "v0.6.0 - Production Release with License System"

echo.
echo Step 4: Add Remote
echo.
git remote add origin https://github.com/hosam-sheboun/h-karate.git

echo.
echo Step 5: Set Main Branch
echo.
git branch -M main

echo.
echo Step 6: Push to GitHub
echo.
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Push failed. You may need to authenticate.
    echo If repository already exists, try: git remote set-url origin https://github.com/hosam-sheboun/h-karate.git
    pause
    exit /b 1
)

echo.
echo Step 7: Create Tag
echo.
git tag -a v0.6.0 -m "v0.6.0 - Production Release"

echo.
echo Step 8: Push Tag
echo.
git push origin v0.6.0

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo Code pushed to GitHub!
echo.
echo Next steps:
echo 1. Go to: https://github.com/hosam-sheboun/h-karate/releases/new
echo 2. Select tag: v0.6.0
echo 3. Title: "H Karate v0.6.0 - Production Release"
echo 4. Upload these files:
echo    - dist\H Karate Scoring Setup 0.6.0.exe
echo    - dist\H-Karate-Scoring-v0.6.0-portable.exe
echo 5. Click "Publish release"
echo.
echo Opening GitHub releases page...
timeout /t 3 >nul
start https://github.com/hosam-sheboun/h-karate/releases/new?tag=v0.6.0
echo.
pause
