// Tesela · service worker: la app funciona sin conexión y las partidas nuevas llegan en cuanto hay red.
const CACHE = 'tesela-v9';
const BASICOS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'data/tesela.json',
  'icons/icon-rounded.svg',
  'icons/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function primeroRed(peticion) {
  const cache = await caches.open(CACHE);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    return (await cache.match(peticion, { ignoreSearch: true })) || Response.error();
  }
}

async function cacheYRefresco(peticion, e) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion);
  const red = fetch(peticion).then((respuesta) => {
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  });
  if (guardada) {
    e.waitUntil(red.catch(() => {}));
    return guardada;
  }
  return red;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  // La página y las partidas, siempre frescas si hay red; el resto, de la caché.
  if (request.mode === 'navigate' || url.pathname.endsWith('.json')) e.respondWith(primeroRed(request));
  else e.respondWith(cacheYRefresco(request, e));
});
