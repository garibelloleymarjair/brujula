@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Brújula 4.0.2 - Verificar
color 0A

echo.
echo =====================================================
echo       VERIFICACION BRÚJULA 4.0.2
echo =====================================================
echo.
set "FAIL=0"
for %%F in (package.json main.js preload.js) do (
  if exist "%%F" (echo [OK] %%F) else (echo [FALTA] %%F & set "FAIL=1")
)
for %%F in (src\index.html src\search.html src\renderer.js src\search.css src\style.css assets\icon.ico backgrounds\aurora.svg backgrounds\cyber.svg backgrounds\forest.svg backgrounds\ocean.svg backgrounds\sunset.svg backgrounds\violet.svg data\seed-index.json) do (
  if exist "%%F" (echo [OK] %%F) else (echo [FALTA] %%F & set "FAIL=1")
)
where node >nul 2>nul
if errorlevel 1 echo [AVISO] Node.js no esta instalado. No se puede revisar JavaScript.
if not errorlevel 1 (
  node --check main.js
  if errorlevel 1 set "FAIL=1"
  node --check preload.js
  if errorlevel 1 set "FAIL=1"
  node --check src\renderer.js
  if errorlevel 1 set "FAIL=1"
)
node -e "const p=require('./package.json'); if((p.dependencies||{}).electron) process.exit(2); if(!p.devDependencies?.electron) process.exit(3); if(!p.devDependencies?.['electron-builder']) process.exit(4); console.log('[OK] Electron y electron-builder estan en devDependencies');"
if errorlevel 1 (
  echo [ERROR] La estructura de dependencias de package.json no es valida.
  set "FAIL=1"
)

echo.
if "%FAIL%"=="0" (echo VERIFICACION COMPLETADA SIN ERRORES.) else (echo VERIFICACION DETECTO PROBLEMAS.)
pause
if "%FAIL%"=="0" exit /b 0
exit /b 1
