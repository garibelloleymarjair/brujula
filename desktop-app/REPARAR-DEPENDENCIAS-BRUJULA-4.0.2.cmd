@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Brújula 4.0.2 - Reparar dependencias
color 0E
set "JCMDRC=%TEMP%\brujula-npmrc-%RANDOM%-%RANDOM%.ini"
>"%JCMDRC%" echo registry=https://registry.npmjs.org/
>>"%JCMDRC%" echo always-auth=false
>>"%JCMDRC%" echo audit=false
>>"%JCMDRC%" echo fund=false
set "npm_config_userconfig=%JCMDRC%"
set "npm_config_registry=https://registry.npmjs.org/"
set "npm_config_always_auth=false"
set "npm_config_audit=false"
set "npm_config_fund=false"

echo.
echo =====================================================
echo     REPARAR DEPENDENCIAS - Brújula 4.0.2
echo =====================================================
echo.
where node >nul 2>nul || (echo Node.js no esta instalado.& pause & exit /b 1)
where npm >nul 2>nul || (echo npm no esta disponible.& pause & exit /b 1)

if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json

echo Verificando cache de npm...
call npm.cmd cache verify

echo.
echo Instalando dependencias aislando la configuracion personal de npm...
call npm.cmd install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo.
  echo La reparacion fallo. La ventana permanece abierta.
  if exist "%JCMDRC%" del /q "%JCMDRC%" >nul 2>nul
  pause
  exit /b 1
)

if exist "%JCMDRC%" del /q "%JCMDRC%" >nul 2>nul
echo.
echo Dependencias reparadas. Ahora ejecuta INSTALAR-Brújula-4.0.2.cmd
pause
