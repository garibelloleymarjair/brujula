# Brújula — Sitio web y aplicación de escritorio

Este repositorio contiene dos partes separadas:

- **`site/`**: página pública estática en español, preparada para Google y GitHub Pages.
- **`desktop-app/`**: código de la aplicación de escritorio Brújula (Electron).

## Publicar la web gratis con GitHub Pages

1. Crea un repositorio nuevo en GitHub. Un nombre recomendado es `brujula`.
2. Sube **todo el contenido de esta carpeta** al nivel principal del repositorio (no subas la carpeta exterior `Brujula-GitHub-Lista` como una carpeta dentro de otra).
3. En GitHub abre **Settings → Pages**. Si aparece la opción de origen, el flujo de GitHub Actions se encargará de publicar el sitio cuando hagas `push` a la rama `main`.
4. Abre la pestaña **Actions** y espera a que termine el flujo **“Publicar Brújula en GitHub Pages”** sin errores.
5. La web tendrá una dirección como `https://TU-USUARIO.github.io/brujula/`. El flujo genera automáticamente el `sitemap.xml`, `robots.txt` y la URL canónica usando el usuario y nombre reales del repositorio.

Si Pages pide elegir un origen, selecciona **GitHub Actions**. Para subir cambios desde tu computador puedes usar **Add file → Upload files**, o GitHub Desktop.

## Solicitar indexación en Google

1. Cuando la página esté publicada, abre [Google Search Console](https://search.google.com/search-console/).
2. Añade la URL completa de GitHub Pages como propiedad de tipo **Prefijo de URL** y verifica la propiedad siguiendo el método disponible en tu cuenta.
3. En “Sitemaps”, envía `sitemap.xml` (incluye la dirección completa de la web y termina en `/sitemap.xml`).
4. Usa “Inspección de URLs” para solicitar la indexación de la página principal.

La indexación y la posición en Google no son inmediatas ni están garantizadas. El sitio está preparado técnicamente para ser rastreado, pero el posicionamiento también depende de la competencia, los enlaces y el contenido útil que se publique.

## Ejecutar la aplicación de escritorio en Windows

Abre la carpeta `desktop-app` en VS Code o cambia a ella en una terminal. Ejecuta:

```powershell
npm install
npm run dev
```

**Importante:** `npm` debe ejecutarse en `desktop-app`, donde está su `package.json`. La carpeta `site` es una web estática y no usa `npm`.

Para generar el instalador de Windows, entra en `desktop-app` y ejecuta `INSTALAR-BRUJULA-4.0.2.cmd` o usa `npm run dist` después de instalar las dependencias.

## Sobre Brújula

Brújula es un proyecto independiente de navegador de escritorio. La web describe la aplicación y enlaza a su repositorio; no afirma que exista un instalador público descargable hasta que se publique uno en GitHub Releases. Los buscadores y servicios de terceros conservan sus propias marcas y políticas.
