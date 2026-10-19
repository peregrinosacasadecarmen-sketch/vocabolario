'use strict';
/* Vocabolario: una parola alla volta, preferite, giochi di ripasso, serie di giorni e temi.
   Tutto resta sul telefono, in localStorage. */

const CHIAVE = 'voc.dati.v1';
const VERSIONE_DATI = 1;
const TEMI = [
  ['carta', 'Carta', 'Chiaro o scuro come il telefono'],
  ['notte', 'Notte', 'Blu scuro e oro'],
  ['salvia', 'Salvia', 'Verde tenue'],
  ['cielo', 'Cielo', 'Azzurro calmo'],
  ['terracotta', 'Terracotta', 'Caldo e deciso'],
  ['lavanda', 'Lavanda', 'Lilla delicato'],
  ['inchiostro', 'Inchiostro', 'Nero puro']
];
const MODI = {
  parola: ['Indovina la parola', 'Leggi la definizione e scegli la parola giusta'],
  significato: ['Qual è il significato?', 'Leggi la parola e scegli la definizione'],
  frase: ['Completa la frase', 'Scegli la parola che manca nell\'esempio']
};
const DOMANDE_PER_PARTITA = 10;

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PER_NOME = new Map(PAROLE.map((p) => [p[0], p]));

/* ---------- Icone ---------- */
const ICO = {
  voce: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  cuore: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
  condividi: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  chiudi: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  indietro: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  spunta: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  libro: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  domanda: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
  penna: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
};

/* ---------- Date ---------- */
function giorno(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function spostaGiorni(n, d = new Date()) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/* ---------- Dati ---------- */
function datiVuoti() {
  return {
    v: VERSIONE_DATI,
    preferite: [],
    viste: {},          // parola -> giorno della prima volta
    risultati: {},      // parola -> { ok, ko, ultimo }
    attivita: {},       // giorno -> parole viste o domande risposte quel giorno
    vistiOggi: { giorno: '', parole: [] },
    filtro: { livello: 0, categorie: [], raccolta: 'tutte' },
    tema: 'carta',
    obiettivo: 10,
    voce: 1,
    serieMax: 0
  };
}

function normalizza(d) {
  const base = datiVuoti();
  if (!d || typeof d !== 'object' || d.v !== VERSIONE_DATI) return null;
  const out = Object.assign(base, d);
  out.filtro = Object.assign(datiVuoti().filtro, d.filtro || {});
  if (!Array.isArray(out.preferite)) out.preferite = [];
  if (!Array.isArray(out.filtro.categorie)) out.filtro.categorie = [];
  for (const k of ['viste', 'risultati', 'attivita']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  if (!out.vistiOggi || !Array.isArray(out.vistiOggi.parole)) out.vistiOggi = { giorno: '', parole: [] };
  if (!TEMI.some((t) => t[0] === out.tema)) out.tema = 'carta';
  out.preferite = out.preferite.filter((k) => PER_NOME.has(k));
  out.filtro.categorie = out.filtro.categorie.filter((k) => k in CATEGORIE);
  out.filtro.livello = LIVELLI[Number(out.filtro.livello)] ? Number(out.filtro.livello) : 0;
  if (!['tutte', 'preferite', 'ripasso'].includes(out.filtro.raccolta)) out.filtro.raccolta = 'tutte';
  for (const k of Object.keys(out.viste)) if (!PER_NOME.has(k)) delete out.viste[k];
  for (const k of Object.keys(out.risultati)) {
    const r = out.risultati[k];
    if (!PER_NOME.has(k) || !r || typeof r !== 'object') { delete out.risultati[k]; continue; }
    out.risultati[k] = { ok: Number(r.ok) || 0, ko: Number(r.ko) || 0, ultimo: r.ultimo === true ? true : r.ultimo === false ? false : null };
  }
  for (const k of Object.keys(out.attivita)) out.attivita[k] = Number(out.attivita[k]) || 0;
  out.obiettivo = [5, 10, 15, 20, 30].includes(Number(out.obiettivo)) ? Number(out.obiettivo) : 10;
  out.voce = [0.8, 1, 1.15].includes(Number(out.voce)) ? Number(out.voce) : 1;
  out.serieMax = Number(out.serieMax) || 0;
  return out;
}

let dati = datiVuoti();
let memoriaOk = true;
let datiRecuperati = false;
(function carica() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (grezzo) {
      let letto = null;
      try { letto = normalizza(JSON.parse(grezzo)); } catch (e) { letto = null; }
      if (letto) dati = letto;
      else {
        /* Dati illeggibili: si mettono da parte prima che il primo salvataggio li sovrascriva. */
        localStorage.setItem(CHIAVE + '.illeggibili-' + Date.now(), grezzo);
        datiRecuperati = true;
      }
    }
  } catch (e) { memoriaOk = false; }
})();

function salva() {
  try { localStorage.setItem(CHIAVE, JSON.stringify(dati)); memoriaOk = true; }
  catch (e) {
    if (memoriaOk) avviso('Non riesco a salvare: la memoria del telefono non è disponibile.');
    memoriaOk = false;
  }
}

/* Un'altra scheda aperta ha salvato: si ricaricano i dati. */
window.addEventListener('storage', (ev) => {
  if (ev.key !== CHIAVE || !ev.newValue) return;
  try { const letto = normalizza(JSON.parse(ev.newValue)); if (letto) { dati = letto; applicaTema(); aggiornaBarre(); } } catch (e) { /* ignorato */ }
});

/* ---------- Avvisi ---------- */
let timerAvviso;
function avviso(testo) {
  /* L'avviso va dentro il foglio aperto per stargli sopra; se il foglio si ridisegna, lo si ricrea. */
  let a = $('#avviso');
  if (!a) {
    a = document.createElement('div');
    a.id = 'avviso'; a.className = 'avviso'; a.hidden = true;
    a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite');
  }
  const aperti = document.querySelectorAll('dialog[open]');
  const dove = aperti.length ? aperti[aperti.length - 1] : document.body;
  if (a.parentElement !== dove) dove.appendChild(a);
  a.textContent = testo;
  a.hidden = false;
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => { a.hidden = true; }, 2600);
}

/* ---------- Attività, serie e obiettivo ---------- */
function registraAttivita(parola) {
  const oggi = giorno();
  if (dati.vistiOggi.giorno !== oggi) dati.vistiOggi = { giorno: oggi, parole: [] };
  if (parola && dati.vistiOggi.parole.includes(parola)) return;
  if (parola) dati.vistiOggi.parole.push(parola);
  const prima = dati.attivita[oggi] || 0;
  dati.attivita[oggi] = prima + 1;
  if (prima < dati.obiettivo && dati.attivita[oggi] >= dati.obiettivo) avviso('Obiettivo di oggi raggiunto!');
  dati.serieMax = Math.max(dati.serieMax || 0, serie());
  salva();
  aggiornaBarre();
}

function serie() {
  let n = 0;
  let d = new Date();
  if (!dati.attivita[giorno(d)]) d = spostaGiorni(-1, d);
  while (dati.attivita[giorno(d)]) { n++; d = spostaGiorni(-1, d); }
  return n;
}

function aggiornaBarre() {
  const s = serie();
  $('#serie-n').textContent = s;
  $('#serie').classList.toggle('spenta', !dati.attivita[giorno()]);
  $('#serie').setAttribute('aria-label', s === 1 ? '1 giorno di fila' : s + ' giorni di fila');
  const fatti = dati.attivita[giorno()] || 0;
  const o = $('#obiettivo');
  o.textContent = 'Oggi ' + Math.min(fatti, dati.obiettivo) + '/' + dati.obiettivo;
  o.classList.toggle('fatto', fatti >= dati.obiettivo);
  $('#etichetta-filtro').textContent = nomeFiltro();
}

/* ---------- Filtro ---------- */
function nomeFiltro() {
  const f = dati.filtro;
  const parti = [];
  if (f.raccolta === 'preferite') parti.push('Preferite');
  else if (f.raccolta === 'ripasso') parti.push('Da ripassare');
  if (f.categorie.length === 1) parti.push(CATEGORIE[f.categorie[0]]);
  else if (f.categorie.length > 1) parti.push(f.categorie.length + ' categorie');
  if (f.livello) parti.push(LIVELLI[f.livello]);
  return parti.length ? parti.join(' · ') : 'Tutte le parole';
}

function daRipassare() {
  return PAROLE.filter((p) => dati.risultati[p[0]] && dati.risultati[p[0]].ultimo === false);
}

function insieme(f = dati.filtro) {
  let base = PAROLE;
  if (f.raccolta === 'preferite') base = PAROLE.filter((p) => dati.preferite.includes(p[0]));
  else if (f.raccolta === 'ripasso') base = daRipassare();
  return base.filter((p) => (!f.livello || p[2] === f.livello) && (!f.categorie.length || f.categorie.includes(p[1])));
}

/* ---------- Mescolare ---------- */
function mescola(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* La parola del giorno è la stessa per tutto il giorno e scelta da tutto l'elenco. */
function parolaDelGiorno() { return PAROLE[hash(giorno()) % PAROLE.length]; }

/* ---------- Il flusso ---------- */
const flusso = $('#flusso');
let coda = [];
let gruppo = [];
let osservatore;

function cartaHtml(p, etichetta, conSuggerimento) {
  const [parola, cat, liv, tipo, def, es] = p;
  const pref = dati.preferite.includes(parola);
  return '<article class="carta" data-parola="' + esc(parola) + '" aria-label="' + esc(parola) + '">' +
    '<div class="etichetta">' + esc(etichetta || CATEGORIE[cat]) + '</div>' +
    '<h1 class="parola">' + esc(parola) + '</h1>' +
    '<p class="info">' + esc(tipo) + ' · ' + esc(LIVELLI[liv]) + '</p>' +
    '<p class="definizione">' + esc(def) + '</p>' +
    '<p class="esempio">«' + esc(es) + '»</p>' +
    '<div class="azioni-carta">' +
      '<button class="azione" type="button" data-azione="voce" aria-label="Ascolta">' + ICO.voce + '</button>' +
      '<button class="azione" type="button" data-azione="preferita" aria-pressed="' + pref + '" aria-label="Preferita">' + ICO.cuore + '</button>' +
      '<button class="azione" type="button" data-azione="condividi" aria-label="Condividi">' + ICO.condividi + '</button>' +
    '</div>' +
    (conSuggerimento ? '<div class="suggerimento">Scorri in su per la prossima parola</div>' : '') +
    '</article>';
}

function ricostruisciFlusso() {
  if (osservatore) osservatore.disconnect();
  flusso.innerHTML = '';
  flusso.scrollTop = 0;
  gruppo = insieme();
  coda = [];
  if (!gruppo.length) {
    const msg = dati.filtro.raccolta === 'preferite' ? 'Non hai ancora parole preferite con questo filtro. Tocca il cuore su una parola per salvarla.'
      : dati.filtro.raccolta === 'ripasso' ? 'Nessuna parola da ripassare: le parole sbagliate nei giochi compariranno qui.'
      : 'Nessuna parola con questo filtro.';
    flusso.innerHTML = '<div class="vuoto"><p class="definizione">' + esc(msg) + '</p><button class="pillola grande" type="button" id="togli-filtro">Mostra tutte le parole</button></div>';
    $('#togli-filtro').addEventListener('click', () => { dati.filtro = datiVuoti().filtro; salva(); aggiornaBarre(); ricostruisciFlusso(); });
    return;
  }
  osservatore = new IntersectionObserver((voci) => {
    for (const v of voci) {
      if (!v.isIntersecting) continue;
      const parola = v.target.dataset.parola;
      if (!(parola in dati.viste)) dati.viste[parola] = giorno();
      registraAttivita(parola);
      if (v.target === flusso.lastElementChild || v.target === flusso.children[flusso.children.length - 3]) aggiungiCarte(12);
    }
  }, { root: flusso, threshold: 0.6 });

  const pdg = parolaDelGiorno();
  const filtroAperto = !dati.filtro.livello && !dati.filtro.categorie.length && dati.filtro.raccolta === 'tutte';
  if (filtroAperto) {
    flusso.insertAdjacentHTML('beforeend', cartaHtml(pdg, 'Parola del giorno', Object.keys(dati.viste).length < 3));
    osservatore.observe(flusso.lastElementChild);
  }
  riempiCoda(filtroAperto ? pdg[0] : null);
  aggiungiCarte(filtroAperto ? 11 : 12, !filtroAperto && Object.keys(dati.viste).length < 3);
}

/* Prima le parole mai viste, poi le altre; finito il giro si ricomincia mescolando. */
function riempiCoda(escludi) {
  const nuove = mescola(gruppo.filter((p) => !(p[0] in dati.viste) && p[0] !== escludi));
  const gia = mescola(gruppo.filter((p) => p[0] in dati.viste && p[0] !== escludi));
  coda = coda.concat(nuove, gia);
  if (!coda.length) coda = gruppo.slice();
}

function aggiungiCarte(n, primaConSuggerimento) {
  let html = '';
  for (let i = 0; i < n; i++) {
    if (!coda.length) riempiCoda();
    const p = coda.shift();
    html += cartaHtml(p, null, primaConSuggerimento && i === 0);
  }
  const prima = flusso.children.length;
  flusso.insertAdjacentHTML('beforeend', html);
  for (let i = prima; i < flusso.children.length; i++) osservatore.observe(flusso.children[i]);
}

/* ---------- Azioni sulla parola ---------- */
function azioneParola(bottone) {
  const carta = bottone.closest('[data-parola]');
  const p = PER_NOME.get(carta.dataset.parola);
  if (!p) return;
  const az = bottone.dataset.azione;
  if (az === 'voce') leggi(p);
  else if (az === 'preferita') {
    const i = dati.preferite.indexOf(p[0]);
    if (i >= 0) dati.preferite.splice(i, 1); else dati.preferite.push(p[0]);
    salva();
    const on = i < 0;
    document.querySelectorAll('[data-parola="' + CSS.escape(p[0]) + '"] [data-azione="preferita"]').forEach((b) => b.setAttribute('aria-pressed', on));
    avviso(on ? 'Aggiunta alle preferite' : 'Tolta dalle preferite');
  } else if (az === 'condividi') condividi(p);
}

let voceItaliana = null;
let avvisoVoceDato = false;
function scegliVoce() {
  if (!('speechSynthesis' in window)) return;
  const voci = speechSynthesis.getVoices().filter((v) => /^it([-_]|$)/i.test(v.lang));
  voceItaliana = voci.find((v) => v.localService) || voci[0] || null;
}
if ('speechSynthesis' in window) { scegliVoce(); speechSynthesis.addEventListener?.('voiceschanged', scegliVoce); }

function leggi(p) {
  if (!('speechSynthesis' in window)) { avviso('La lettura ad alta voce non è disponibile su questo dispositivo.'); return; }
  if (!voceItaliana) scegliVoce();
  speechSynthesis.cancel();
  /* Su Safari una lettura avviata subito dopo cancel() a volte si perde. */
  setTimeout(() => {
    for (const testo of [p[0], p[4]]) {
      const u = new SpeechSynthesisUtterance(testo);
      u.lang = 'it-IT';
      if (voceItaliana) u.voice = voceItaliana;
      u.rate = dati.voce;
      speechSynthesis.speak(u);
    }
  }, 60);
  if (!avvisoVoceDato) { avvisoVoceDato = true; avviso('Nessun suono? Controlla il tasto silenzioso dell\'iPhone.'); }
}

async function condividi(p) {
  const testo = p[0] + ' (' + p[3] + ')\n' + p[4] + '\n«' + p[5] + '»';
  if (navigator.share) {
    try { await navigator.share({ text: testo }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(testo); avviso('Copiata negli appunti'); }
  catch (e) { avviso('Non riesco a condividere da qui.'); }
}

flusso.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-azione]');
  if (b) azioneParola(b);
});

/* ---------- Fogli ---------- */
function testaFoglio(titolo, id, indietro) {
  return '<div class="maniglia">' +
    (indietro ? '<button class="chiudi" type="button" data-indietro aria-label="Indietro">' + ICO.indietro + '</button>' : '') +
    '<h2 id="' + id + '" tabindex="-1" autofocus>' + esc(titolo) + '</h2>' +
    '<button class="chiudi" type="button" data-chiudi aria-label="Chiudi">' + ICO.chiudi + '</button></div>';
}

document.querySelectorAll('dialog.foglio').forEach((d) => {
  d.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-chiudi]')) { d.close(); return; }
    if (ev.target !== d) return;
    const r = d.getBoundingClientRect();
    if (ev.clientY < r.top || ev.clientY > r.bottom || ev.clientX < r.left || ev.clientX > r.right) d.close();
  });
  d.addEventListener('close', () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const a = $('#avviso');
    if (a && a.parentElement === d) document.body.appendChild(a);
  });
});

function apri(d) { if (!d.open) d.showModal(); }

/* --- Categorie e livello --- */
let filtroBozza;
function apriCategorie() {
  filtroBozza = JSON.parse(JSON.stringify(dati.filtro));
  disegnaCategorie();
  apri($('#foglio-categorie'));
}

function disegnaCategorie() {
  const d = $('#foglio-categorie');
  const f = filtroBozza;
  const conta = (cat) => insieme(Object.assign({}, f, { categorie: cat ? [cat] : [] })).length;
  let h = testaFoglio('Cosa vuoi imparare', 'cat-titolo') + '<div class="corpo">';
  h += '<h3>Raccolta</h3><div class="chip" data-gruppo="raccolta">' +
    [['tutte', 'Tutte'], ['preferite', 'Preferite (' + dati.preferite.length + ')'], ['ripasso', 'Da ripassare (' + daRipassare().length + ')']]
      .map(([k, n]) => '<button type="button" data-v="' + k + '" aria-pressed="' + (f.raccolta === k) + '">' + esc(n) + '</button>').join('') + '</div>';
  h += '<h3>Livello</h3><div class="chip" data-gruppo="livello">' +
    [[0, 'Tutti']].concat(Object.entries(LIVELLI).map(([k, n]) => [Number(k), n]))
      .map(([k, n]) => '<button type="button" data-v="' + k + '" aria-pressed="' + (f.livello === k) + '">' + esc(n) + '</button>').join('') + '</div>';
  h += '<h3>Categorie</h3><ul class="righe">';
  h += '<li><button class="riga" type="button" role="checkbox" data-cat="" aria-checked="' + !f.categorie.length + '"><span class="spunta">' + ICO.spunta + '</span><span class="tit"><b>Tutte le categorie</b></span><span class="num">' + conta('') + '</span></button></li>';
  for (const [k, n] of Object.entries(CATEGORIE)) {
    h += '<li><button class="riga" type="button" role="checkbox" data-cat="' + k + '" aria-checked="' + f.categorie.includes(k) + '"><span class="spunta">' + ICO.spunta + '</span><span class="tit"><b>' + esc(n) + '</b></span><span class="num">' + conta(k) + '</span></button></li>';
  }
  h += '</ul><button class="btn primario" type="button" id="applica-filtro">Mostra ' + insieme(f).length + ' parole</button></div>';
  d.innerHTML = h;
}

$('#foglio-categorie').addEventListener('click', (ev) => {
  const chip = ev.target.closest('[data-gruppo] button');
  if (chip) {
    const g = chip.parentElement.dataset.gruppo;
    filtroBozza[g] = g === 'livello' ? Number(chip.dataset.v) : chip.dataset.v;
    disegnaCategorie();
    return;
  }
  const riga = ev.target.closest('[data-cat]');
  if (riga) {
    const k = riga.dataset.cat;
    if (!k) filtroBozza.categorie = [];
    else {
      const i = filtroBozza.categorie.indexOf(k);
      if (i >= 0) filtroBozza.categorie.splice(i, 1); else filtroBozza.categorie.push(k);
      if (filtroBozza.categorie.length === Object.keys(CATEGORIE).length) filtroBozza.categorie = [];
    }
    disegnaCategorie();
    return;
  }
  if (ev.target.closest('#applica-filtro')) {
    dati.filtro = filtroBozza;
    salva();
    aggiornaBarre();
    ricostruisciFlusso();
    $('#foglio-categorie').close();
  }
});

/* --- Temi --- */
function applicaTema() {
  document.documentElement.dataset.tema = dati.tema;
  const sfondo = getComputedStyle(document.documentElement).getPropertyValue('--sfondo').trim();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', sfondo || '#f4efe6');
}

function apriTemi() {
  const d = $('#foglio-temi');
  d.innerHTML = testaFoglio('Temi', 'temi-titolo') + '<div class="corpo"><div class="temi">' +
    TEMI.map(([k, n, desc]) => '<button class="tema" type="button" data-tema="' + k + '" data-scelta="' + k + '" aria-pressed="' + (dati.tema === k) + '"><b>' + esc(n) + '</b><small>' + esc(desc) + '</small></button>').join('') +
    '</div></div>';
  apri(d);
}

$('#foglio-temi').addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-scelta]');
  if (!t) return;
  dati.tema = t.dataset.scelta;
  salva();
  applicaTema();
  $('#foglio-temi').querySelectorAll('[data-scelta]').forEach((b) => b.setAttribute('aria-pressed', b === t));
});

/* --- Profilo: numeri, liste, ricerca, impostazioni, copia dei dati --- */
let confermaAzzera = false;
function apriProfilo() {
  confermaAzzera = false;
  disegnaProfilo();
  apri($('#foglio-profilo'));
}

function rigaParola(p, extra) {
  return '<li><button class="riga" type="button" data-apri="' + esc(p[0]) + '"><span class="tit"><b>' + esc(p[0]) + '</b><small>' + esc(p[4]) + '</small></span>' + (extra ? '<span class="num">' + esc(extra) + '</span>' : '') + '</button></li>';
}

function elenco(lista, vuoto, extra) {
  if (!lista.length) return '<p class="nota">' + esc(vuoto) + '</p>';
  return '<ul class="righe">' + lista.map((p) => rigaParola(p, extra && extra(p))).join('') + '</ul>';
}

function disegnaProfilo() {
  const d = $('#foglio-profilo');
  const viste = Object.keys(dati.viste);
  const recenti = viste.slice(-15).reverse().map((k) => PER_NOME.get(k)).filter(Boolean);
  const preferite = dati.preferite.slice().reverse().map((k) => PER_NOME.get(k)).filter(Boolean);
  const ripasso = daRipassare();
  const giorni = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
  let sett = '';
  for (let i = 6; i >= 0; i--) {
    const x = spostaGiorni(-i);
    sett += '<div class="giorno' + (dati.attivita[giorno(x)] ? ' si' : '') + '"><i></i>' + giorni[x.getDay()] + '</div>';
  }
  let h = testaFoglio('Il tuo vocabolario', 'prof-titolo') + '<div class="corpo">';
  h += '<div class="cifre"><div class="cifra"><b>' + serie() + '</b><small>giorni di fila</small></div>' +
    '<div class="cifra"><b>' + esc(dati.serieMax || 0) + '</b><small>record</small></div>' +
    '<div class="cifra"><b>' + viste.length + '/' + PAROLE.length + '</b><small>parole viste</small></div></div>';
  h += '<div class="settimana" aria-label="Ultimi 7 giorni">' + sett + '</div>';

  h += '<h3>Cerca una parola</h3><input type="search" id="cerca" placeholder="Parola o significato" autocomplete="off" enterkeyhint="search"><div id="risultati-ricerca"></div>';
  h += '<h3>Preferite (' + preferite.length + ')</h3>' + elenco(preferite, 'Tocca il cuore su una parola per salvarla qui.');
  h += '<h3>Da ripassare (' + ripasso.length + ')</h3>' + elenco(ripasso, 'Le parole sbagliate nei giochi compariranno qui.', (p) => {
    const r = dati.risultati[p[0]]; return r.ok + '✓ ' + r.ko + '✗';
  });
  h += '<h3>Viste di recente</h3>' + elenco(recenti, 'Ancora nessuna parola vista.');

  h += '<h3>Impostazioni</h3>' +
    '<label class="impostazione"><span>Obiettivo giornaliero</span><select id="sel-obiettivo">' +
      [5, 10, 15, 20, 30].map((n) => '<option value="' + n + '"' + (dati.obiettivo === n ? ' selected' : '') + '>' + n + ' parole</option>').join('') + '</select></label>' +
    '<label class="impostazione"><span>Velocità della voce</span><select id="sel-voce">' +
      [[0.8, 'Lenta'], [1, 'Normale'], [1.15, 'Veloce']].map(([v, n]) => '<option value="' + v + '"' + (dati.voce === v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>';

  h += '<h3>Copia dei dati</h3><p class="nota">Preferite, progressi e serie restano solo su questo telefono. Salva una copia ogni tanto.</p>' +
    '<button class="btn" type="button" id="esporta">Salva una copia</button>' +
    '<button class="btn" type="button" id="importa">Ripristina da una copia</button>' +
    '<input type="file" id="file-copia" accept="application/json,.json" hidden>' +
    '<button class="btn pericolo" type="button" id="azzera">' + (confermaAzzera ? 'Tocca di nuovo per cancellare tutto' : 'Azzera i progressi') + '</button>' +
    '<p class="nota">' + PAROLE.length + ' parole, con definizioni ed esempi scritti per questa app.</p>';
  h += '</div>';
  d.innerHTML = h;
}

function cercaParole(testo) {
  const q = testo.trim().toLowerCase();
  const box = $('#risultati-ricerca');
  if (!q) { box.innerHTML = ''; return; }
  const trovate = PAROLE.filter((p) => p[0].includes(q)).concat(PAROLE.filter((p) => !p[0].includes(q) && p[4].toLowerCase().includes(q))).slice(0, 30);
  box.innerHTML = '<div style="margin-top:10px">' + elenco(trovate, 'Nessuna parola trovata.') + '</div>';
}

$('#foglio-profilo').addEventListener('input', (ev) => {
  if (ev.target.id === 'cerca') cercaParole(ev.target.value);
});
$('#foglio-profilo').addEventListener('change', (ev) => {
  if (ev.target.id === 'sel-obiettivo') { dati.obiettivo = Number(ev.target.value); salva(); aggiornaBarre(); }
  else if (ev.target.id === 'sel-voce') { dati.voce = Number(ev.target.value); salva(); }
  else if (ev.target.id === 'file-copia') importa(ev.target.files[0]);
});
$('#foglio-profilo').addEventListener('click', (ev) => {
  const r = ev.target.closest('[data-apri]');
  if (r) { apriParola(r.dataset.apri); return; }
  const id = ev.target.closest('button') && ev.target.closest('button').id;
  if (id === 'esporta') esporta();
  else if (id === 'importa') $('#file-copia').click();
  else if (id === 'azzera') {
    if (!confermaAzzera) {
      confermaAzzera = true;
      const b = ev.target.closest('button');
      b.textContent = 'Tocca di nuovo per cancellare tutto';
      setTimeout(() => { confermaAzzera = false; if (b.isConnected) b.textContent = 'Azzera i progressi'; }, 4000);
      return;
    }
    const tema = dati.tema;
    dati = datiVuoti();
    dati.tema = tema;
    salva();
    aggiornaBarre();
    ricostruisciFlusso();
    confermaAzzera = false;
    disegnaProfilo();
    avviso('Progressi azzerati');
  }
});

async function esporta() {
  const nome = 'vocabolario-copia-' + giorno() + '.json';
  const file = new File([JSON.stringify(dati, null, 1)], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: nome }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function importa(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let letto = null;
    try { letto = normalizza(JSON.parse(r.result)); } catch (e) { letto = null; }
    if (!letto) { avviso('Questo file non è una copia del Vocabolario.'); return; }
    if (!confirm('Sostituire i progressi di questo telefono con quelli della copia?')) return;
    dati = letto;
    salva();
    applicaTema();
    aggiornaBarre();
    ricostruisciFlusso();
    disegnaProfilo();
    avviso('Copia ripristinata');
  };
  r.readAsText(file);
}

/* --- Una parola aperta da un elenco --- */
function apriParola(nome) {
  const p = PER_NOME.get(nome);
  if (!p) return;
  const d = $('#foglio-parola');
  d.innerHTML = testaFoglio('', 'parola-titolo') + '<div class="corpo">' + cartaHtml(p).replace('class="carta"', 'class="carta" style="height:auto;min-height:0;padding:0 8px 8px"') + '</div>';
  apri(d);
}
$('#foglio-parola').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-azione]');
  if (b) azioneParola(b);
});
$('#foglio-parola').addEventListener('close', () => { if ($('#foglio-profilo').open) disegnaProfiloMantenendoRicerca(); });

function disegnaProfiloMantenendoRicerca() {
  const q = $('#cerca') ? $('#cerca').value : '';
  const scroll = $('#foglio-profilo').scrollTop;
  disegnaProfilo();
  if (q) { $('#cerca').value = q; cercaParole(q); }
  $('#foglio-profilo').scrollTop = scroll;
}

/* ---------- Giochi di ripasso ---------- */
let fonte = 'filtro';
let partita = null;

function fontiGioco() {
  return {
    filtro: ['Parole del filtro', insieme()],
    viste: ['Già viste', PAROLE.filter((p) => p[0] in dati.viste)],
    preferite: ['Preferite', PAROLE.filter((p) => dati.preferite.includes(p[0]))],
    ripasso: ['Da ripassare', daRipassare()]
  };
}

/* Per "Completa la frase" servono esempi che contengono la parola nella stessa forma. */
function contieneParola(p) { return p[5].toLowerCase().includes(p[0].toLowerCase()); }

function apriRipassa() {
  partita = null;
  disegnaMenuGiochi();
  apri($('#foglio-ripassa'));
}

function disegnaMenuGiochi() {
  const d = $('#foglio-ripassa');
  const fonti = fontiGioco();
  if (!fonti[fonte][1].length) fonte = 'filtro';
  let h = testaFoglio('Ripassa', 'rip-titolo') + '<div class="corpo">';
  h += '<h3>Con quali parole</h3><div class="chip" id="fonti">' +
    Object.entries(fonti).map(([k, [n, l]]) => '<button type="button" data-fonte="' + k + '" aria-pressed="' + (fonte === k) + '"' + (l.length ? '' : ' disabled') + '>' + esc(n) + ' (' + l.length + ')</button>').join('') + '</div>';
  h += '<h3>Gioco</h3><div class="modi">';
  const ico = { parola: ICO.libro, significato: ICO.domanda, frase: ICO.penna };
  for (const [k, [n, desc]] of Object.entries(MODI)) {
    h += '<button class="modo" type="button" data-modo="' + k + '"><span class="ico">' + ico[k] + '</span><span><b>' + esc(n) + '</b><small>' + esc(desc) + '</small></span></button>';
  }
  h += '</div><p class="nota">Ogni partita ha fino a ' + DOMANDE_PER_PARTITA + ' domande. Le parole sbagliate finiscono in «Da ripassare» finché non le indovini.</p></div>';
  d.innerHTML = h;
}

function nuovaPartita(modo) {
  let lista = fontiGioco()[fonte][1];
  if (modo === 'frase') lista = lista.filter(contieneParola);
  if (!lista.length) { avviso('Nessuna parola adatta a questo gioco con questa scelta.'); return; }
  partita = { modo, domande: mescola(lista).slice(0, DOMANDE_PER_PARTITA), i: 0, giuste: 0, errori: [], risposto: false };
  disegnaDomanda();
}

function distrattori(p, modo) {
  const stessoTipo = PAROLE.filter((x) => x[0] !== p[0] && x[3] === p[3]);
  const altri = PAROLE.filter((x) => x[0] !== p[0] && x[3] !== p[3]);
  return mescola(stessoTipo).concat(mescola(altri)).slice(0, 3);
}

function disegnaDomanda() {
  const d = $('#foglio-ripassa');
  const { modo, domande, i } = partita;
  const p = domande[i];
  const opzioni = mescola([p].concat(distrattori(p, modo)));
  const testoOpzione = (x) => (modo === 'significato' ? x[4] : x[0]);
  let domanda;
  if (modo === 'parola') domanda = '<p class="domanda">' + esc(p[4]) + '</p>';
  else if (modo === 'significato') domanda = '<p class="domanda grande">' + esc(p[0]) + '</p>';
  else {
    const pos = p[5].toLowerCase().indexOf(p[0].toLowerCase());
    domanda = '<p class="domanda">«' + esc(p[5].slice(0, pos)) + '_____' + esc(p[5].slice(pos + p[0].length)) + '»</p>';
  }
  let h = testaFoglio(MODI[modo][0], 'rip-titolo', true) + '<div class="corpo">';
  h += '<div class="nota" style="margin:0 0 8px">Domanda ' + (i + 1) + ' di ' + domande.length + '</div>';
  h += '<div class="progresso"><i style="width:' + (i / domande.length * 100) + '%"></i></div>';
  h += domanda + '<div class="opzioni">' +
    opzioni.map((x) => '<button class="opzione" type="button" data-risposta="' + esc(x[0]) + '">' + esc(testoOpzione(x)) + '</button>').join('') +
    '</div><div id="dopo"></div></div>';
  partita.risposto = false;
  partita.pronta = Date.now() + 300;
  d.innerHTML = h;
  d.scrollTop = 0;
  $('#rip-titolo').focus({ preventScroll: true });
}

function rispondi(b) {
  if (partita.risposto || Date.now() < partita.pronta) return;
  partita.risposto = true;
  const p = partita.domande[partita.i];
  const giusta = b.dataset.risposta === p[0];
  const r = dati.risultati[p[0]] || { ok: 0, ko: 0, ultimo: null };
  if (giusta) { r.ok++; partita.giuste++; } else { r.ko++; partita.errori.push(p); }
  r.ultimo = giusta;
  dati.risultati[p[0]] = r;
  if (!(p[0] in dati.viste)) dati.viste[p[0]] = giorno();
  registraAttivita('gioco:' + p[0]);
  document.querySelectorAll('#foglio-ripassa .opzione').forEach((o) => {
    o.disabled = true;
    if (o.dataset.risposta === p[0]) o.classList.add('giusta');
    else if (o === b) o.classList.add('errata');
  });
  const ultima = partita.i === partita.domande.length - 1;
  $('#dopo').innerHTML = '<p class="nota" style="margin-top:16px"><b>' + esc(p[0]) + '</b>: ' + esc(p[4]) + '</p>' +
    '<button class="btn primario" type="button" id="avanti">' + (ultima ? 'Vedi il risultato' : 'Avanti') + '</button>';
  $('#avanti').focus({ preventScroll: true });
  $('#avanti').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function disegnaEsito() {
  const d = $('#foglio-ripassa');
  const { giuste, domande, errori, modo } = partita;
  const frase = giuste === domande.length ? 'Perfetto!' : giuste >= domande.length * 0.7 ? 'Molto bene!' : 'Continua così: la ripetizione funziona.';
  let h = testaFoglio('Risultato', 'rip-titolo', true) + '<div class="corpo">';
  h += '<p class="esito">' + giuste + '/' + domande.length + '</p><p class="nota" style="font-size:1rem">' + esc(frase) + '</p>';
  if (errori.length) h += '<h3>Da ripassare</h3>' + elenco(errori, '');
  h += '<button class="btn primario" type="button" data-modo="' + modo + '">Gioca ancora</button><button class="btn" type="button" data-indietro>Scegli un altro gioco</button></div>';
  d.innerHTML = h;
  d.scrollTop = 0;
  $('#rip-titolo').focus({ preventScroll: true });
  partita = null;
}

$('#foglio-ripassa').addEventListener('click', (ev) => {
  const f = ev.target.closest('[data-fonte]');
  if (f) { fonte = f.dataset.fonte; disegnaMenuGiochi(); return; }
  const m = ev.target.closest('[data-modo]');
  if (m) { nuovaPartita(m.dataset.modo); return; }
  const o = ev.target.closest('[data-risposta]');
  if (o) { rispondi(o); return; }
  if (ev.target.closest('#avanti')) {
    if (partita.i < partita.domande.length - 1) { partita.i++; disegnaDomanda(); } else disegnaEsito();
    return;
  }
  if (ev.target.closest('[data-indietro]')) { partita = null; disegnaMenuGiochi(); return; }
  const a = ev.target.closest('[data-apri]');
  if (a) apriParola(a.dataset.apri);
});

/* ---------- Avvio ---------- */
$('#btn-categorie').addEventListener('click', apriCategorie);
$('#btn-temi').addEventListener('click', apriTemi);
$('#btn-profilo').addEventListener('click', apriProfilo);
$('#btn-ripassa').addEventListener('click', apriRipassa);

/* Riaprendo l'app un altro giorno si aggiornano serie, obiettivo e parola del giorno. */
let giornoAperto = giorno();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  aggiornaBarre();
  if (giorno() !== giornoAperto) { giornoAperto = giorno(); ricostruisciFlusso(); }
});
setInterval(() => { if (giorno() !== giornoAperto) { giornoAperto = giorno(); aggiornaBarre(); } }, 60000);

applicaTema();
aggiornaBarre();
ricostruisciFlusso();
if (datiRecuperati) avviso('I dati salvati erano illeggibili: li ho messi da parte e riparto da zero.');
if (!memoriaOk) avviso('La memoria del telefono non è disponibile: i progressi non verranno salvati.');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
