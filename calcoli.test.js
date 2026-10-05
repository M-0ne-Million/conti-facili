// Test dei calcoli: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as c from './calcoli.js';

test('lettura numeri all\'italiana', () => {
  assert.equal(c.numero('35'), 35);
  assert.equal(c.numero('35,5'), 35.5);
  assert.equal(c.numero('1.234,56 €'), 1234.56);
  assert.equal(c.numero('12.5'), 12.5);
  assert.equal(c.numero('1.000.000'), 1000000);
  assert.equal(c.numero('150.000'), 150000);   // punto delle migliaia all'italiana
  assert.equal(c.numero('0.125'), 0.125);
  assert.ok(Number.isNaN(c.numero('')));
  assert.ok(Number.isNaN(c.numero('abc')));
  assert.equal(c.euro(555878).replace(/\s/g, ' '), '5.558,78 €');   // punto delle migliaia anche sotto 10.000
});

test('ricevuta: ritenuta solo per sostituti d\'imposta, bollo oltre 77,47', () => {
  assert.deepEqual(c.ricevuta(15000, true), { lordo: 15000, ritenuta: 3000, netto: 12000, bollo: true });
  assert.deepEqual(c.ricevuta(15000, false), { lordo: 15000, ritenuta: 0, netto: 15000, bollo: true });
  assert.equal(c.ricevuta(7747, true).bollo, false);
  assert.equal(c.ricevuta(7748, true).bollo, true);
  assert.equal(c.ricevuta(3333, true).ritenuta, 667);
});

test('dal netto al lordo: il netto torna sempre al centesimo', () => {
  assert.equal(c.lordoDaNetto(10000, true), 12500);
  assert.equal(c.lordoDaNetto(10000, false), 10000);
  for (let netto = 1; netto < 300000; netto += 7) {
    const r = c.ricevuta(netto, true, true);
    assert.ok(Math.abs(r.netto - netto) <= 1, `netto ${netto} -> ${r.netto}`);
  }
});

test('IVA', () => {
  assert.deepEqual(c.scorporoIva(12200, 22), { imponibile: 10000, iva: 2200, totale: 12200 });
  assert.deepEqual(c.scorporoIva(100, 22), { imponibile: 82, iva: 18, totale: 100 });
  assert.deepEqual(c.aggiungiIva(10000, 10), { imponibile: 10000, iva: 1000, totale: 11000 });
});

test('mutuo', () => {
  assert.equal(c.rataMutuo(100000, 3, 20).toFixed(2), '554.60');
  assert.equal(c.rataMutuo(12000, 0, 1), 1000);
  const piano = c.ammortamento(100000, 3, 20);
  assert.equal(piano.length, 20);
  assert.ok(piano.at(-1).residuo < 0.01);
  const capitaleRimborsato = piano.reduce((s, r) => s + r.quota, 0);
  assert.ok(Math.abs(capitaleRimborsato - 100000) < 0.01);
});

test('sconti e percentuali', () => {
  assert.deepEqual(c.sconto(80, 25), { finale: 60, risparmio: 20 });
  assert.equal(c.percentualeDi(30, 120), 25);
  assert.equal(c.variazione(80, 100), 25);
});

test('affitti brevi', () => {
  // 1.000 € incassati, 15% di commissione, 60 € di pulizie, cedolare 21%
  assert.deepEqual(c.affittoBreve({ lordo: 100000, commissionePerc: 15, pulizie: 6000, aliquota: 21 }),
    { commissione: 15000, cedolare: 21000, netto: 58000 });
  assert.equal(c.affittoBreve({ lordo: 100000, commissionePerc: 0, aliquota: 26 }).cedolare, 26000);
  // 2,50 € × (3 ospiti − 1 bambino esente) × 7 notti, massimo 5 notti tassabili
  assert.equal(c.tassaSoggiorno(250, 3, 1, 7, 5), 2500);
  assert.equal(c.tassaSoggiorno(250, 3, 1, 7), 3500);
  assert.equal(c.tassaSoggiorno(250, 1, 2, 7), 0);
});

const vicino = (a, b) => assert.ok(Math.abs(a - b) < 0.02, `${a} invece di ${b}`);

test('stipendio netto 2026: casi della ricerca fiscale (senza addizionali)', () => {
  vicino(c.stipendioNetto(25000).netto, 20875.85);
  vicino(c.stipendioNetto(25000).irpef, 1826.65);
  vicino(c.stipendioNetto(40000).netto, 28783.91);
  vicino(c.stipendioNetto(40000).irpef, 7540.09);
  vicino(c.stipendioNetto(12000).netto, 12123.40);   // somma esente 5,3% + trattamento integrativo
  vicino(c.stipendioNetto(18000).netto, 16347.67);   // somma esente 4,8%
  vicino(c.stipendioNetto(30000).netto, 24021.40);   // maggiorazione 65 €
  vicino(c.stipendioNetto(60000).netto, 38835.50);   // +1% INPS oltre 56.224
  vicino(c.stipendioNetto(25000, 2.53).netto, 20301.48);   // con addizionali 1,73% + 0,8%
});

test('forfettario 2026', () => {
  const p = c.forfettario({ ricavi: 50000, coefficiente: 78 });
  vicino(p.contributi, 10167.30);
  vicino(p.imposta, 4324.91);
  vicino(c.forfettario({ ricavi: 50000, coefficiente: 78, aliquota: 5 }).imposta, 1441.64);
  vicino(c.forfettario({ ricavi: 60000, coefficiente: 40, gestione: 'commercianti' }).contributi, 5882.64);
  vicino(c.forfettario({ ricavi: 60000, coefficiente: 40, gestione: 'commercianti', riduzione: true }).contributi, 3826.32);
  vicino(c.forfettario({ ricavi: 20000, coefficiente: 67, gestione: 'artigiani' }).contributi, 4521.36);   // sotto il minimale: solo il fisso
});

test('codice fiscale', () => {
  assert.equal(c.codiceFiscale({ cognome: 'Rossi', nome: 'Mario', data: '1985-12-10', sesso: 'M', comune: 'A562' }), 'RSSMRA85T10A562S');
  assert.equal(c.codiceFiscale({ cognome: 'De Luca', nome: 'Gianfranco', data: '1990-03-05', sesso: 'M', comune: 'F205' }).slice(0, 6), 'DLCGFR');
  assert.equal(c.codiceFiscale({ cognome: 'Fo', nome: 'Ida', data: '2001-01-31', sesso: 'F', comune: 'H501' }).slice(0, 11), 'FOXDIA01A71');
  assert.equal(c.codiceFiscale({ cognome: "D'Amico", nome: 'Lucia', data: '1970-07-01', sesso: 'F', comune: 'L219' }).slice(0, 6), 'DMCLCU');
  assert.ok(c.codiceFiscaleValido('RSSMRA85T10A562S'));
  assert.ok(c.codiceFiscaleValido('rssmra85t10a562s'));
  assert.ok(!c.codiceFiscaleValido('RSSMRA85T10A562T'));
  assert.ok(!c.codiceFiscaleValido('RSSMRA85T10A56'));
});

test('IBAN', () => {
  assert.ok(c.ibanValido('IT60 X054 2811 1010 0000 0123 456'));
  assert.ok(c.ibanValido('DE89370400440532013000'));
  assert.ok(!c.ibanValido('IT60X0542811101000000123457'));
  assert.ok(!c.ibanValido('IT60X054281110100000012345'));   // corto per l'Italia
});

test('IMU', () => {
  vicino(c.imu({ rendita: 1000, categoria: 'A/2', aliquota: 8.6 }).imposta, 1444.80);
  vicino(c.imu({ rendita: 1000, categoria: 'A/2', aliquota: 8.6, quota: 50, mesi: 6 }).imposta, 361.20);
  vicino(c.imu({ rendita: 300, categoria: 'C/1', aliquota: 10.6 }).imposta, 183.65);
  vicino(c.imu({ rendita: 2000, categoria: 'A/1', aliquota: 5, detrazione: 200 }).imposta, 1480);   // abitazione principale di lusso
});

test('interesse composto', () => {
  vicino(c.interesseComposto({ capitale: 10000, tasso: 5, anni: 10 }).versato + c.interesseComposto({ capitale: 10000, tasso: 5, anni: 10 }).guadagno, 16288.95);
  const p = c.interesseComposto({ mensile: 100, tasso: 0, anni: 10 });
  vicino(p.netto, 12000);
  const t = c.interesseComposto({ capitale: 10000, tasso: 5, anni: 10, tasse: 26 });
  vicino(t.imposte, 6288.95 * 0.26);
});
