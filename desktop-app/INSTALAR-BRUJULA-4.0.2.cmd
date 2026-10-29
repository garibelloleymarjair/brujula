@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Brújula 4.0.2 - Instalador
color 0B

set "LOG=%CD%\INSTALACION-Brújula-4.0.2.log"
set "JCMDRC=%TEMP%\brujula-npmrc-%RANDOM%-%RANDOM%.ini"

echo. > "%LOG%"
echo ===================================================== >> "%LOG%"
echo Brújula 4.0.2 - INSTALACION >> "%LOG%"
echo ===================================================== >> "%LOG%"

echo.
echo =====================================================
echo              BRÚJULA 4.0.2
echo       INSTALADOR ROBUSTO - SIN CREDENCIALES
echo =====================================================
echo.

echo [COMPROBACION] Buscando Node.js...
where node >nul 2>nul
if errorlevel 1 goto :nonode
where npm >nul 2>nul
if errorlevel 1 goto :nonpm

for /f "delims=" %%V in ('node -v') do echo Node: %%V
for /f "delims=" %%V in ('npm -v') do echo npm : %%V

rem Configuracion npm aislada: no usa el .npmrc personal del usuario.
>"%JCMDRC%" echo registry=https://registry.npmjs.org/
>>"%JCMDRC%" echo always-auth=false
>>"%JCMDRC%" echo audit=false
>>"%JCMDRC%" echo fund=false
set "npm_config_userconfig=%JCMDRC%"
set "npm_config_registry=https://registry.npmjs.org/"
set "npm_config_always_auth=false"
set "npm_config_audit=false"
set "npm_config_fund=false"

if not exist package.json goto :badproject

if exist node_modules (
  echo.
  echo [1/3] Dependencias detectadas. Verificando instalacion...
) else (
  echo.
  echo [1/3] Descargando dependencias de Brújula...
)

echo Ejecutando npm install... >> "%LOG%"
call npm.cmd install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/ >> "%LOG%" 2>&1
if errorlevel 1 goto :npmerror

echo.
echo [2/3] Comprobando Electron...
call npx.cmd --no-install electron --version >> "%LOG%" 2>&1
if errorlevel 1 goto :electronerror
call npx.cmd --no-install electron-builder --version >> "%LOG%" 2>&1
if errorlevel 1 goto :buildererror

if exist dist rmdir /s /q dist >nul 2>nul

echo.
echo [3/3] Generando instalador de Windows...
call npm.cmd run dist >> "%LOG%" 2>&1
if errorlevel 1 goto :buildererror

if exist "%JCMDRC%" del /q "%JCMDRC%" >nul 2>nul

echo.
echo =====================================================
echo      BRÚJULA 4.0.2 GENERADO CORRECTAMENTE
echo =====================================================
echo.
echo Busca en la carpeta "dist" el archivo:
echo Brujula-Setup-4.0.2.exe
echo.
echo El instalador crea el acceso directo en el Escritorio
echo y en Inicio. Luego puedes anclarlo a la barra de tareas.
echo.
echo Registro guardado en:
echo %LOG%
echo =====================================================
echo.
start "" explorer.exe "%CD%\dist"
pause
exit /b 0

:nonode
echo.
echo ERROR: Node.js no esta instalado.
echo Instala Node.js LTS y vuelve a ejecutar este archivo.
echo https://nodejs.org/
pause
exit /b 1

:nonpm
echo.
echo ERROR: npm no esta disponible en PATH.
echo Cierra y vuelve a abrir esta carpeta/terminal despues de instalar Node.js.
pause
exit /b 1

:badproject
echo.
echo ERROR: Falta package.json en la carpeta del proyecto.
pause
exit /b 1

:npmerror
echo.
echo ERROR: npm no pudo instalar las dependencias.
echo La ventana NO se cerrara para que puedas ver el mensaje.
echo Revisa: %LOG%
echo.
if exist "%JCMDRC%" del /q "%JCMDRC%" >nul 2>nul
pause
exit /b 1

:electronerror
echo.
echo ERROR: Electron no pudo quedar instalado correctamente.
echo Revisa: %LOG%
echo.
if exist "%JCMDRC%" del /q "%JCMDRC%" >nul 2>nul
pause
exit /b 1

:buildererror
echo.
echo ERROR: electron-builder no pudo generar el instalador EXE.
echo La ventana NO se cerrara.
echo Revisa el registro completo en:
echo %LOG%
echo.
if exist "%JCMDRC%" del /q "%JCMDRC%" >nul 2>nul
pause
exit /b 1
