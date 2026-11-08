@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

where.exe node >nul 2>&1
if %ERRORLEVEL% neq 0 goto :NoNode

if exist "%SCRIPT_DIR%vellum.mjs" goto :RunLocal
if exist "%SCRIPT_DIR%bin\vellum.mjs" goto :RunSubBin
if exist "%SCRIPT_DIR%resources\bin\vellum.mjs" goto :RunResources

echo [Vellum CLI] Error: Could not locate vellum.mjs in %SCRIPT_DIR% >&2
exit /b 1

:RunLocal
if not exist "%SCRIPT_DIR%lib\args.mjs" goto :BrokenInstall
node "%SCRIPT_DIR%vellum.mjs" %*
exit /b %ERRORLEVEL%

:RunSubBin
node "%SCRIPT_DIR%bin\vellum.mjs" %*
exit /b %ERRORLEVEL%

:RunResources
node "%SCRIPT_DIR%resources\bin\vellum.mjs" %*
exit /b %ERRORLEVEL%

:NoNode
echo [Vellum CLI] Error: Node.js was not found in PATH. >&2
echo Please install Node.js from https://nodejs.org to execute Vellum CLI commands. >&2
exit /b 1

:BrokenInstall
echo [Vellum CLI] Error: the "lib" folder is missing next to vellum.mjs in %SCRIPT_DIR% >&2
echo The Vellum installation looks incomplete. Reinstall the latest Vellum version. >&2
exit /b 1
