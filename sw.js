const CACHE = 'v8-final-2026';
const assets = ['./', './index.html', './style.css', './script.js', './manifest.json', './assets/alarma1.mp3', './assets/alarma2.mp3', './assets/alarma3.mp3'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));