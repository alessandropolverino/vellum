@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
call "%SCRIPT_DIR%vellum.cmd" %*
exit /b %ERRORLEVEL%
