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
