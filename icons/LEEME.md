# Tesela · kit de logo

Logo elegido: **baldosa hidráulica**. Son cuatro baldosas que forman una flor roja en el centro, con cuartos de círculo azules en las esquinas.

## Archivos

| Archivo | Uso |
|---|---|
| `icon.svg` | Icono maestro, cuadrado y a sangre (512×512) |
| `icon-rounded.svg` | El mismo icono con las esquinas redondeadas, para la web y redes |
| `favicon.svg` | Favicon vectorial, con juntas más gruesas para que se lea a 16 px |
| `favicon.ico` | Favicon clásico (16, 32 y 48 px) |
| `favicon-32.png` | Favicon en PNG |
| `apple-touch-icon.png` | Icono para iOS (180×180) |
| `icon-192.png`, `icon-512.png` | Iconos de la PWA (purpose `any`) |
| `icon-maskable-512.png` | Icono de la PWA con margen de seguridad (purpose `maskable`) |
| `logo-horizontal.svg` | Icono + nombre en horizontal (cabecera) |
| `logo-vertical.svg` | Icono + nombre en vertical (pantalla de inicio, «Acerca de») |

## Colores

| Nombre | Hex | Uso |
|---|---|---|
| Rojo almagre | `#b23a48` | Flor central, acento principal |
| Azul cobalto | `#2a4d69` | Esquinas y texto del nombre |
| Blanco hueso | `#f4ede2` | Fondo de la baldosa |
| Junta | `#c9d3dc` | Juntas y fondo del icono |
| Fondo claro | `#e7ecf1` | Fondo de la página |

## Tipografía

El nombre va en **Young Serif** (Google Fonts). Dentro de los SVG está como texto, no como trazos. Por eso, si se cargan con `<img>`, se verán en Georgia. En la web conviene escribir «Tesela» como texto HTML con esa fuente:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&display=swap">
```

## Prompt para Claude Code

> Integra el logo de Tesela que está en la carpeta `tesela-logo/`. Lee primero `LEEME.md`.
> 1. Copia los archivos a la carpeta de recursos estáticos del proyecto (p. ej. `icons/`).
> 2. En el `<head>`, añade `favicon.svg` (`type="image/svg+xml"`), `favicon.ico` como alternativa y `apple-touch-icon.png`, y `<meta name="theme-color" content="#2a4d69">`.
> 3. En `manifest.webmanifest`, usa `icon-192.png` e `icon-512.png` con `"purpose": "any"` e `icon-maskable-512.png` con `"purpose": "maskable"`. Pon `background_color` `#e7ecf1` y `theme_color` `#2a4d69`.
> 4. En la cabecera del juego, pon `icon-rounded.svg` a unos 40 px junto al nombre «Tesela» escrito como texto HTML en Young Serif, color `#2a4d69`.
> 5. Usa `#b23a48` como color de acento de la interfaz (casilla activa, botones principales) y `#f4ede2` para las casillas.
> No modifiques los archivos del logo.

Fragmento del manifest:

```json
"icons": [
  { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
],
"background_color": "#e7ecf1",
"theme_color": "#2a4d69"
```
