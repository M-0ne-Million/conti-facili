// Test della generazione del sito: node --test (esegue build.py e controlla public/).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const citta = JSON.parse(readFileSync('pagine/dati/tassa-soggiorno.json', 'utf8'));
const pagina = (percorso) => readFileSync(`public/${percorso}/index.html`, 'utf8');

before(() => execFileSync('python3', ['build.py']));

test('dati della tassa di soggiorno completi e plausibili', () => {
  assert.ok(citta.length >= 30, `solo ${citta.length} città`);
  const campi = ['nome', 'slug', 'regione', 'tariffa', 'notti_max', 'eta_esenzione', 'note', 'fonte', 'tipo_fonte', 'verificato'];
  for (const c of citta) {
    assert.deepEqual(Object.keys(c).filter((k) => k !== 'tetto').sort(), [...campi].sort(), c.nome);
    assert.match(c.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, c.nome);
    assert.ok(c.tariffa > 0 && c.tariffa <= 12, `${c.nome}: tariffa ${c.tariffa}`);
    assert.match(c.fonte, /^https:\/\//, c.nome);
    assert.ok(['comune', 'settore'].includes(c.tipo_fonte), c.nome);
    assert.match(c.verificato, /^\d{4}-\d{2}-\d{2}$/, c.nome);
  }
  assert.equal(new Set(citta.map((c) => c.slug)).size, citta.length, 'slug duplicati');
});

test('una pagina per ogni città, con nome e tariffa', () => {
  for (const c of citta) {
    const html = pagina(`tassa-di-soggiorno/${c.slug}`);
    assert.ok(html.includes(`Tassa di soggiorno a ${c.nome}`), c.nome);
    assert.ok(html.includes(c.tariffa.toLocaleString('it-IT', { minimumFractionDigits: 2 })), `${c.nome}: tariffa assente`);
  }
});

test('dove la tariffa è un massimo (percentuale del prezzo), la pagina dice "fino a"', () => {
  const conTetto = citta.filter((c) => c.tetto);
  assert.ok(conTetto.length >= 3, 'Bergamo, Bologna e Siracusa hanno un tetto');
  for (const c of conTetto) {
    const prezzo = c.tariffa.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    assert.ok(pagina(`tassa-di-soggiorno/${c.slug}`).includes(`fino a ${prezzo} €`), c.nome);
    assert.ok(pagina('tassa-di-soggiorno').includes(`fino a ${prezzo} €`), `${c.nome} nell'indice`);
  }
});

test('indice delle città raggruppate per regione, presenti nella sitemap', () => {
  const indice = pagina('tassa-di-soggiorno');
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  for (const c of citta) {
    assert.ok(indice.includes(`href="${c.slug}/"`), `${c.nome} manca nell'indice`);
    assert.ok(indice.includes(`>${c.regione}<`), `regione ${c.regione} manca`);
    assert.ok(sitemap.includes(`tassa-di-soggiorno/${c.slug}/`), `${c.nome} manca nella sitemap`);
  }
});

test('il calcolatore principale usa le città del file dati', () => {
  const html = pagina('calcolo-tassa-di-soggiorno');
  for (const c of citta) assert.ok(html.includes(`>${c.nome}</option>`), `${c.nome} manca nel menu`);
  assert.ok(existsSync('public/dati/tassa-soggiorno.json'));
});

// ---------------------------------------------------------------------------
// Pagine di confronto con affiliazioni
const confronti = JSON.parse(readFileSync('pagine/dati/confronti.json', 'utf8'));
const affiliati = Object.fromEntries(
  [...(readFileSync('sito.toml', 'utf8').split('[affiliati]')[1] ?? '').matchAll(/^([a-z0-9-]+)\s*=\s*"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
const dataIt = (iso) => iso.split('-').reverse().join('/');

test('dati dei confronti completi', () => {
  assert.ok(confronti.length >= 4);
  const chiavi = confronti.flatMap((c) => c.servizi.map((s) => s.chiave));
  assert.equal(new Set(chiavi).size, chiavi.length, 'chiavi duplicate');
  for (const c of confronti) {
    assert.ok(c.titolo && c.intro && c.criteri.length && c.faq.length, c.slug);
    assert.ok(c.servizi.length >= 3, `${c.slug}: pochi servizi`);
    for (const s of c.servizi) {
      for (const k of ['nome', 'prezzo', 'adatto_a']) assert.ok(s[k], `${s.chiave}: manca ${k}`);
      assert.match(s.sito, /^https:\/\//, s.chiave);
      assert.match(s.fonte_prezzo, /^https:\/\//, s.chiave);
      assert.match(s.verificato, /^\d{4}-\d{2}-\d{2}$/, s.chiave);
    }
  }
});

test('una pagina per confronto, con ogni servizio, prezzo e data di verifica', () => {
  for (const c of confronti) {
    const html = pagina(`confronto/${c.slug}`);
    assert.ok(html.includes(c.titolo), c.slug);
    assert.ok(html.includes('Alcuni link sono affiliati'), `${c.slug}: manca la nota sulle affiliazioni`);
    for (const s of c.servizi) {
      assert.ok(html.includes(s.nome) && html.includes(s.prezzo), `${c.slug}: ${s.nome}`);
      assert.ok(html.includes(dataIt(s.verificato)), `${c.slug}: data di ${s.nome}`);
    }
  }
});

test('link affiliato se configurato in sito.toml, altrimenti sito ufficiale senza "sponsored"', () => {
  for (const c of confronti) {
    const html = pagina(`confronto/${c.slug}`);
    for (const s of c.servizi) {
      const link = affiliati[s.chiave];
      const atteso = link ? `href="${link}" rel="sponsored noopener"` : `href="${s.sito}" rel="noopener"`;
      assert.ok(html.includes(atteso), `${s.nome}: atteso ${atteso}`);
    }
  }
});

test('indice dei confronti, sitemap e collegamenti dalle guide', () => {
  const indice = pagina('confronti');
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  for (const c of confronti) {
    assert.ok(indice.includes(`confronto/${c.slug}/`), `${c.slug} manca nell'indice`);
    assert.ok(sitemap.includes(`confronto/${c.slug}/`), `${c.slug} manca nella sitemap`);
  }
  assert.ok(pagina('guida-partita-iva-forfettaria').includes('confronto/commercialisti-online/'));
  assert.ok(pagina('guida-affitti-brevi-2026').includes('confronto/software-host/'));
  assert.ok(pagina('tassa-di-soggiorno/firenze').includes('confronto/software-host/'));
});

// ---------------------------------------------------------------------------
// Calendario delle scadenze (.ics) e newsletter
const scadenze = JSON.parse(readFileSync('pagine/dati/scadenze.json', 'utf8'));
const newsletterForm = (readFileSync('sito.toml', 'utf8').match(/^newsletter_form\s*=\s*"([^"]*)"/m) ?? [])[1] ?? '';
const CALENDARI = { forfettari: (s) => s.per.includes('forfettari'), host: (s) => s.per.includes('host'), tutte: () => true };

test('dati delle scadenze completi e ordinati', () => {
  const gruppi = ['forfettari', 'occasionali', 'host', 'proprietari', 'dipendenti'];
  for (const s of scadenze) {
    assert.match(s.data, /^\d{4}-\d{2}-\d{2}$/, s.titolo);
    assert.ok(s.titolo && s.descrizione && s.per.length, s.data);
    assert.ok(s.per.every((p) => gruppi.includes(p)), `${s.titolo}: gruppo sconosciuto`);
    assert.match(s.fonte, /^https:\/\//, s.titolo);
    if (s.link) assert.ok(existsSync(`public/${s.link}index.html`), `${s.titolo}: link ${s.link} inesistente`);
  }
  assert.deepEqual(scadenze.map((s) => s.data), scadenze.map((s) => s.data).sort(), 'non ordinate');
});

test('file .ics validi: una voce per scadenza del gruppo, righe standard', () => {
  for (const [nome, filtro] of Object.entries(CALENDARI)) {
    const ics = readFileSync(`public/calendario/${nome}.ics`, 'utf8');
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'), nome);
    assert.ok(!/[^\r]\n/.test(ics), `${nome}: righe senza CRLF`);
    for (const riga of ics.split('\r\n')) assert.ok(Buffer.byteLength(riga) <= 75, `${nome}: riga troppo lunga: ${riga}`);
    const attese = scadenze.filter(filtro);
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length ?? 0, attese.length, nome);
    for (const s of attese) assert.ok(ics.includes(`DTSTART;VALUE=DATE:${s.data.replaceAll('-', '')}`), `${nome}: ${s.titolo}`);
  }
});

test('pagina del calendario: tutte le scadenze e i pulsanti per iscriversi', () => {
  const html = pagina('calendario-scadenze-fiscali');
  for (const s of scadenze) assert.ok(html.includes(s.titolo), s.titolo);
  for (const segno of ['webcal://', 'calendar.google.com/calendar/render?cid=', 'outlook.live.com/calendar/0/addfromweb', 'calendario/tutte.ics'])
    assert.ok(html.includes(segno), `manca ${segno}`);
  assert.ok(readFileSync('public/sitemap.xml', 'utf8').includes('calendario-scadenze-fiscali/'));
});

test('modulo newsletter e privacy solo se il modulo MailerLite è configurato', () => {
  const html = pagina('calendario-scadenze-fiscali'), privacy = pagina('privacy');
  if (!newsletterForm) {
    assert.ok(!html.includes('class="newsletter"'), 'modulo presente senza configurazione');
    assert.ok(!privacy.includes('MailerLite'), 'privacy parla di newsletter senza configurazione');
  } else {
    assert.ok(html.includes(`action="${newsletterForm}"`));
    assert.ok(/type="checkbox"[^>]*required/.test(html), 'consenso obbligatorio');
    assert.ok(!/type="checkbox"[^>]*checked/.test(html), 'consenso preselezionato');
    assert.ok(privacy.includes('MailerLite'));
  }
});
