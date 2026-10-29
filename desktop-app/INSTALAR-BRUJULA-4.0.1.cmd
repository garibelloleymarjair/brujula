@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Brújula 4.0.1 - Instalador
color 0B

echo.
echo =====================================================
echo              BRÚJULA 4.0.1
echo          INSTALADOR SIN CREDENCIALES
echo =====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado.
  echo Instala Node.js LTS desde:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no esta disponible en PATH.
  echo Cierra y vuelve a abrir Windows despues de instalar Node.js.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%V in ('node -v') do echo Node detectado: %%V
for /f "delims=" %%V in ('npm -v') do echo npm detectado: %%V

echo.
echo [1/3] Instalando TODAS las dependencias necesarias...
set "npm_config_production=false"
npm install --include=dev --no-audit --no-fund
if errorlevel 1 goto :npmerror

echo.
echo [2/3] Comprobando Electron y electron-builder...
npx --no-install electron --version >nul 2>nul
if errorlevel 1 goto :npmerror
npx --no-install electron-builder --version
if errorlevel 1 goto :npmerror

echo.
echo [3/3] Generando instalador EXE de Windows...
npm run dist
if errorlevel 1 goto :builderror

echo.
echo =====================================================
echo INSTALADOR GENERADO CORRECTAMENTE
 echo.
echo Abre la carpeta dist y ejecuta el archivo:
echo Brújula-Browser-Setup-4.0.1.exe
echo.
echo La instalacion esta configurada para el usuario actual,
echo sin obligar a instalar para todos los usuarios.
echo =====================================================
start "" explorer.exe "%CD%\dist"
pause
exit /b 0

:npmerror
echo.
echo ERROR: No se pudieron instalar/comprobar las dependencias.
echo Usa REPARAR-DEPENDENCIAS-4.0.1.cmd y vuelve a intentarlo.
pause
exit /b 1

:builderror
echo.
echo ERROR: electron-builder no pudo generar el EXE.
echo Revisa el mensaje que aparece encima de esta linea.
pause
exit /b 1
