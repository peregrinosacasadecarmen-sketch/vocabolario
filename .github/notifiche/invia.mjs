/* Invia una parola come notifica al telefono. Gira su GitHub Actions ogni mezz'ora tra le 9 e le 21 (ora di Madrid)
   e spedisce solo negli orari previsti per il numero di parole al giorno scelto nell'app (5, 10 o 15).
   Segreti: ISCRIZIONE (codice copiato dall'app) e VAPID_PRIVATA. Con PROVA=1 invia subito; con SECCO=1 non invia nulla. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const radice = new URL('../../', import.meta.url);
const INIZIO = 9 * 60, FINE = 21 * 60, PASSO = 30;

function oraMadrid(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { giorno: `${p.year}-${p.month}-${p.day}`, minuti: Number(p.hour) * 60 + Number(p.minute) };
}

/* Gli N orari della giornata, distribuiti in modo uniforme sulle mezz'ore tra INIZIO e FINE. */
export function orari(n) {
  const slot = (FINE - INIZIO) / PASSO;
  return [...new Set(Array.from({ length: n }, (_, i) => INIZIO + Math.round(i * slot / Math.max(1, n - 1)) * PASSO))];
}

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function scegliParola(parole, livello, chiave) {
  const gruppo = livello ? parole.filter((p) => p[2] === livello) : parole;
  return gruppo[hash(chiave) % gruppo.length];
}

function caricaParole() {
  const ctx = { PAROLE: undefined };
  vm.createContext(ctx);
  for (const f of ['parole.js', 'parole-wiki.js', 'parole-geo.js']) {
    vm.runInContext(readFileSync(new URL(f, radice), 'utf8').replace(/^'use strict';/, '').replace(/\bconst (PAROLE|CATEGORIE|LIVELLI)\b/g, 'var $1'), ctx);
  }
  return ctx.PAROLE;
}

const { giorno, minuti } = oraMadrid(process.env.ORA_FINTA ? new Date(process.env.ORA_FINTA) : new Date());
const corrente = Math.floor(minuti / PASSO) * PASSO;
const iscrizione = JSON.parse(process.env.ISCRIZIONE || 'null');
if (!iscrizione || !iscrizione.sub || !iscrizione.sub.endpoint) {
  console.log('Nessuna iscrizione configurata: niente da inviare.');
  process.exit(0);
}
const n = [5, 10, 15].includes(iscrizione.n) ? iscrizione.n : 10;
const prova = process.env.PROVA === '1';
if (!prova && !orari(n).includes(corrente)) {
  console.log(`Ore ${Math.floor(corrente / 60)}:${String(corrente % 60).padStart(2, '0')} a Madrid: non è uno degli orari (${n} al giorno).`);
  process.exit(0);
}
const parole = caricaParole();
const p = scegliParola(parole, Number(iscrizione.livello) || 0, giorno + '/' + corrente + (prova ? '/' + Date.now() : ''));
const messaggio = { parola: p[0], tipo: p[3], definizione: p[4] };
console.log('Parola scelta:', p[0], `(${giorno} ${Math.floor(corrente / 60)}:${String(corrente % 60).padStart(2, '0')})`);
if (process.env.SECCO === '1') process.exit(0);

const webpush = (await import('web-push')).default;
const pubblica = readFileSync(new URL('notifiche-chiave.js', radice), 'utf8').match(/VAPID_PUBBLICA = '([^']*)'/)[1];
webpush.setVapidDetails('https://peregrinosacasadecarmen-sketch.github.io/vocabolario/', pubblica, process.env.VAPID_PRIVATA);
try {
  await webpush.sendNotification(iscrizione.sub, JSON.stringify(messaggio), { TTL: 3 * 3600, urgency: 'normal' });
  console.log('Inviata.');
} catch (e) {
  console.error('Invio fallito:', e.statusCode, e.body || e.message);
  if (e.statusCode === 404 || e.statusCode === 410) console.error("L'iscrizione non è più valida: riattiva le notifiche nell'app e manda il nuovo codice.");
  process.exit(1);
}
