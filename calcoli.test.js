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
