@echo off
setlocal
cd /d "%~dp0"
title Kaoru's Studio - Servidor local

where py >nul 2>&1
if %errorlevel%==0 (
  py "%~dp0KAORU_SERVER.py"
  goto :eof
)

where python >nul 2>&1
if %errorlevel%==0 (
  python "%~dp0KAORU_SERVER.py"
  goto :eof
)

echo.
echo No se encontro Python en el sistema.
echo Abriendo Kaoru's Studio directamente como alternativa...
start "" "%~dp0index.html"
pause
