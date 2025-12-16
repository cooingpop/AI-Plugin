@echo off

echo ========================================
echo    ./offrecord Build
echo ========================================
echo.

where go >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed.
    echo.
    echo Install Go:
    echo   1. https://go.dev/dl/
    echo   2. Download Windows installer
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)

echo Downloading dependencies...
cd /d "%~dp0"
go mod tidy

echo Building...
go build -o offrecord.exe -ldflags="-s -w" .
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Build Complete!
echo ========================================
echo.
echo Created: offrecord.exe
echo.
echo Usage:
echo   Run offrecord.exe
echo   1. Create Room - become host
echo   2. Join Room   - connect to host
echo.
pause
