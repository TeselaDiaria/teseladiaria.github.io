# Tesela

Dameros diarios: cada día, una cita de la literatura en español escondida en una rejilla. PWA estática, sin dependencias ni compilación.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `styles.css`, `app.js` | La aplicación |
| `data/tesela.json` | Las partidas (contiene las soluciones) |
| `scripts/validar.js` | Validador de las partidas |
| `sw.js`, `manifest.webmanifest` | PWA: funciona sin conexión y se puede instalar |
| `icons/` | Kit del logo (ver `icons/LEEME.md`; no se modifica) |

## Probar en local

```sh
npm start        # sirve la carpeta en http://localhost:8000
npm test         # valida data/tesela.json
```

Hay que servirla por HTTP: abierta como `file://` no puede leer el JSON.

## Añadir partidas

Se añaden al final de `data/tesela.json`, con fecha consecutiva, y se pasa `npm test` antes de publicar. El validador comprueba que:

1. las letras de las respuestas suman exactamente las de la frase;
2. las casillas cubren de 1 a N sin repetirse;
3. cada letra de una respuesta coincide con la de la frase en su casilla;
4. las iniciales de las respuestas forman la palabra oculta;
5. las fechas son consecutivas y no se repiten.

Además avisa (sin fallar) si no se cumplen las normas de estilo: 20–45 letras, 4–7 respuestas de 4 letras o más que no repitan palabras de la frase.

Si se cambia algo de la app, conviene subir la versión de `CACHE` en `sw.js` para que los móviles la actualicen enseguida.
