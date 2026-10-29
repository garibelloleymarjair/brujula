@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Brújula 4.0.1 - Reparar dependencias
color 0E

echo.
echo ===============================================
echo      REPARAR DEPENDENCIAS DE Brújula 4.0.1
echo ===============================================
echo.
where node >nul 2>nul || (echo Node.js no esta instalado.& pause & exit /b 1)
where npm >nul 2>nul || (echo npm no esta disponible.& pause & exit /b 1)

if exist node_modules rmdir /s /q node_modules

echo Limpiando cache de npm...
npm cache verify

echo.
echo Instalando dependencias de desarrollo...
set "npm_config_production=false"
npm install --include=dev --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo La reparacion fallo. Revisa el error anterior.
  pause
  exit /b 1
)

echo.
echo Dependencias reparadas. Prueba ahora INSTALAR-Brújula-4.0.1.cmd
pause
