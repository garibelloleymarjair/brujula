@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Brújula 4.0.1 - Verificar
color 0A

echo Verificando archivos de Brújula...
for %%F in (package.json main.js preload.js) do (
  if exist "%%F" (echo OK  %%F) else (echo FALTA  %%F)
)
if not exist src\index.html echo FALTA  src\index.html
if not exist src\search.html echo FALTA  src\search.html
if not exist assets\icon.ico echo FALTA  assets\icon.ico
node --check main.js
if errorlevel 1 goto :bad
node --check preload.js
if errorlevel 1 goto :bad
node --check src\renderer.js
if errorlevel 1 goto :bad
node --check src\search.js 2>nul
if not errorlevel 1 echo OK  src\search.js

echo.
echo VERIFICACION COMPLETADA.
pause
exit /b 0
:bad
echo.
echo HAY UN ERROR DE SINTAXIS.
pause
exit /b 1
