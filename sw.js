const CACHE = 'v8-final-2026';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest/site.webmanifest',
  './assets/alarma1.mp3',
  './assets/alarma2.mp3',
  './assets/alarma3.mp3',
  './icons/favicon-192x192.png',
  './icons/favicon-512x512.png'
];

// Instalación: Guardar archivos críticos en el dispositivo
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      console.log('Smart Voice Alarm: Archivos del sistema almacenados.');
      return c.addAll(assets);
    })
  );
});

// Estrategia de carga: Primero caché, luego red
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      return r || fetch(e.request);
    })
  );
});

// Limpieza de versiones antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE) return caches.delete(key);
        })
      );
    })
  );
});
