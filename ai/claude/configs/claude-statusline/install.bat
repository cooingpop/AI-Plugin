@echo off
setlocal EnableDelayedExpansion

:: Keep window open on double-click
if "%~1"=="" (
    cmd /k "%~f0" run
    exit /b
)

echo.
echo ========================================================
echo    Claude Code Status Line Installer (Windows)
echo ========================================================
echo.

:: Script location
set "SCRIPT_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"

echo Script Path: %SCRIPT_DIR%
echo Install Path: %CLAUDE_DIR%
echo.

:: 1. Check PowerShell
echo [1/4] Checking PowerShell...
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [X] PowerShell not found
    goto :error
)
echo   [OK] PowerShell found

:: 2. Create .claude directory
echo [2/4] Checking .claude directory...
if not exist "%CLAUDE_DIR%" (
    mkdir "%CLAUDE_DIR%"
    if %ERRORLEVEL% NEQ 0 (
        echo   [X] Failed to create directory
        goto :error
    )
    echo   [OK] Directory created: %CLAUDE_DIR%
) else (
    echo   [OK] Directory already exists
)

:: 3. Copy files
echo [3/4] Copying files...

:: Check source files
if not exist "%SCRIPT_DIR%settings-windows.json" (
    echo   [X] settings-windows.json not found
    echo   Path: %SCRIPT_DIR%settings-windows.json
    goto :error
)

if not exist "%SCRIPT_DIR%statusline.ps1" (
    echo   [X] statusline.ps1 not found
    echo   Path: %SCRIPT_DIR%statusline.ps1
    goto :error
)

:: Backup existing settings.json
if exist "%CLAUDE_DIR%\settings.json" (
    echo   [!] Backing up existing settings.json...
    copy "%CLAUDE_DIR%\settings.json" "%CLAUDE_DIR%\settings.json.backup" >nul 2>&1
)

:: Copy settings.json
copy "%SCRIPT_DIR%settings-windows.json" "%CLAUDE_DIR%\settings.json" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [X] Failed to copy settings.json
    goto :error
)
echo   [OK] settings.json copied

:: Copy statusline.ps1
copy "%SCRIPT_DIR%statusline.ps1" "%CLAUDE_DIR%\statusline.ps1" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [X] Failed to copy statusline.ps1
    goto :error
)
echo   [OK] statusline.ps1 copied

:: 4. Set execution policy
echo [4/4] Setting PowerShell execution policy...
powershell -Command "if ((Get-ExecutionPolicy -Scope CurrentUser) -eq 'Restricted') { Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force }" 2>nul
echo   [OK] Execution policy set

:: Success message
echo.
echo ========================================================
echo    [OK] Installation Complete!
echo ========================================================
echo.
echo Install Location: %CLAUDE_DIR%
echo.
echo Status Line Example:
echo   [Opus] Context: ============........ 60%% left (120K/200K)
echo.
echo Color Guide:
echo   Green  0-49%%   : Plenty of space
echo   Yellow 50-79%%  : Caution
echo   Red    80-99%%  : Warning
echo   Red    100%%+   : Compressed
echo.
echo Restart Claude Code to apply changes.
echo.
goto :end

:error
echo.
echo ========================================================
echo    [X] Installation Failed!
echo ========================================================
echo.

:end
echo.
echo Press any key to exit...
pause >nul
