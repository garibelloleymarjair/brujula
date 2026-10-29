# Brújula 4.0.2

Brújula es una aplicación de escritorio que reúne navegación web, buscadores, investigación y herramientas de personalización.

## Instalación
1. Tener Node.js LTS instalado.
2. Extraer el ZIP completo.
3. Abrir `INSTALAR-BRUJULA-4.0.2.cmd`.
4. El script instala dependencias y genera `dist\Brujula-Setup-4.0.2.exe`.
5. Ejecutar ese instalador para instalar Brújula.

El instalador está configurado para el usuario actual, con acceso directo en Escritorio e Inicio.

## Si vuelve a fallar
La ventana permanece abierta y guarda el proceso en `INSTALACION-BRUJULA-4.0.2.log`.
También puedes ejecutar `REPARAR-DEPENDENCIAS-BRUJULA-4.0.2.cmd`.

## Dependencias
- Electron 38.2.0
- electron-builder 26.15.3

No se necesita una API externa para las funciones básicas.
