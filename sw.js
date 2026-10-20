'use strict';
/* Funzionamento senza connessione: i file dell'app vengono tenuti in copia sul dispositivo.
   A ogni rilascio cambiare VERSIONE, così i telefoni scaricano subito tutti i file nuovi insieme. */
const PREFISSO = 'voc-';
const VERSIONE = PREFISSO + 'v4';
const FILE = ['./', 'index.html', 'style.css', 'parole.js', 'parole-wiki.js', 'extra.js', 'notifiche-chiave.js', 'app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

const BASE = new URL('./', self.location).href;
const NOTI = new Set(FILE.map((f) => new URL(f, BASE).href));

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSIONE)
      .then((c) => c.addAll(FILE.map((f) => new Request(new URL(f, BASE).href, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

/* Si eliminano solo le copie vecchie di questa app, non quelle di altri siti sullo stesso indirizzo. */
self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n.startsWith(PREFISSO) && n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Solo i file dell'app: prima la copia locale (apertura immediata, anche offline), poi aggiornamento in sottofondo. */
self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  url.search = '';
  url.hash = '';
  const chiave = url.href;
  if (!NOTI.has(chiave)) return;
  ev.respondWith((async () => {
    const cache = await caches.open(VERSIONE);
    const inCopia = await cache.match(chiave);
    const aggiorna = fetch(chiave, { cache: 'no-cache' })
      .then(async (risposta) => {
        if (risposta && risposta.ok && risposta.type === 'basic') await cache.put(chiave, risposta.clone());
        return risposta;
      })
      .catch(() => null);
    if (inCopia) { ev.waitUntil(aggiorna); return inCopia; }
    return (await aggiorna) || Response.error();
  })());
});

/* Notifiche: il messaggio porta la parola già scelta. Un tocco apre l'app su quella parola. */
self.addEventListener('push', (ev) => {
  let d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch (e) { d = {}; }
  const titolo = d.parola || 'Vocabolario';
  const testo = d.definizione ? (d.tipo ? d.tipo + ' — ' : '') + d.definizione : 'Una nuova parola ti aspetta.';
  ev.waitUntil(self.registration.showNotification(titolo, {
    body: testo,
    icon: new URL('icons/icon-192.png', BASE).href,
    badge: new URL('icons/icon-192.png', BASE).href,
    tag: 'voc-' + titolo,
    data: { parola: d.parola || '' }
  }));
});

self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const parola = (ev.notification.data && ev.notification.data.parola) || '';
  const url = new URL(parola ? './?parola=' + encodeURIComponent(parola) : './', BASE).href;
  ev.waitUntil((async () => {
    const aperte = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = aperte.find((c) => c.url.startsWith(BASE));
    if (app) { await app.focus(); if (parola) app.postMessage({ tipo: 'apri-parola', parola }); return; }
    await self.clients.openWindow(url);
  })());
});
