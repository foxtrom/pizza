// Service worker : garde une copie de l'appli sur le téléphone pour qu'elle
// fonctionne sans réseau. Les données, elles, sont dans IndexedDB.
//
// IMPORTANT : changer VERSION à chaque mise en ligne d'une modification,
// sinon l'iPhone continuera d'utiliser l'ancienne copie.
//
// Les caches s'appellent « pizzeria-… » : Brasserie Ensen, publiée sur le même
// domaine github.io, supprime tous les caches « ensen-… » qui ne sont pas les siens.

const VERSION = '0.1.0';
const PREFIXE = 'pizzeria-';
const CACHE = `${PREFIXE}${VERSION}`;

const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/calculs.js',
  './js/db.js',
  './js/donnees.js',
  './js/ecrans.js',
  './js/exemples.js',
  './js/import.js',
  './js/outils.js',
  './js/recettes.js',
  './js/ui.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    // cache: 'reload' contourne le cache HTTP de GitHub Pages (10 min) pour prendre les fichiers neufs.
    caches.open(CACHE).then((cache) => cache.addAll(FICHIERS.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom.startsWith(PREFIXE) && nom !== CACHE).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (evenement) => {
  // L'appli demande l'activation quand on touche « Mettre à jour ».
  if (evenement.data === 'activer') self.skipWaiting();
  // Version affichée dans Réglages.
  if (evenement.data === 'version') evenement.source?.postMessage({ type: 'version', version: VERSION });
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;
  evenement.respondWith(
    caches.match(requete, { ignoreSearch: true }).then(
      (enCache) =>
        enCache ??
        fetch(requete).catch(() => (requete.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
    ),
  );
});
