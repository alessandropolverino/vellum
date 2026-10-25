@echo off
setlocal
call "%~dp0bin\vellum.cmd" %*
exit /b %ERRORLEVEL%
