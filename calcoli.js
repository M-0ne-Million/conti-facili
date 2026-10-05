// Calcoli puri usati da tutte le pagine (e da calcoli.test.js). Importi in centesimi interi.

export const RITENUTA = 0.20;
export const SOGLIA_BOLLO = 7747; // oltre 77,47 € serve la marca da bollo da 2 €

// '35' | '35,5' | '1.234,56' | '150.000' | '12.5' -> 35, 35.5, 1234.56, 150000, 12.5 (NaN se non è un numero)
export function numero(testo) {
  let t = String(testo).replace(/[€%\s]/g, '');
  if (t.includes(',') || /^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  return t === '' ? NaN : Number(t);
}

export const cent = (x) => Math.round(x * 100);
export const euro = (c) => (c / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export const ritenuta = (lordo, sostituto) => (sostituto ? Math.round(lordo * RITENUTA) : 0);
export const serveBollo = (lordo) => lordo > SOGLIA_BOLLO;

// Lordo da scrivere in ricevuta per incassare esattamente `netto`.
export function lordoDaNetto(netto, sostituto) {
  if (!sostituto) return netto;
  const stima = Math.round(netto / (1 - RITENUTA));
  for (const l of [stima, stima - 1, stima + 1]) if (l - ritenuta(l, true) === netto) return l;
  return stima; // il centesimo esatto non esiste: differenza massima 1 cent
}

export function ricevuta(importo, sostituto, eNetto = false) {
  const lordo = eNetto ? lordoDaNetto(importo, sostituto) : importo;
  const r = ritenuta(lordo, sostituto);
  return { lordo, ritenuta: r, netto: lordo - r, bollo: serveBollo(lordo) };
}

export function scorporoIva(totale, aliquota) {
  const imponibile = Math.round(totale / (1 + aliquota / 100));
  return { imponibile, iva: totale - imponibile, totale };
}

export function aggiungiIva(imponibile, aliquota) {
  const iva = Math.round((imponibile * aliquota) / 100);
  return { imponibile, iva, totale: imponibile + iva };
}

// Rata mensile (in euro, non arrotondata) di un mutuo alla francese.
export function rataMutuo(capitale, tanPerc, anni) {
  const r = tanPerc / 100 / 12, n = anni * 12;
  return r === 0 ? capitale / n : (capitale * r) / (1 - (1 + r) ** -n);
}

// Piano di ammortamento riassunto per anno: quota capitale, interessi, debito residuo.
export function ammortamento(capitale, tanPerc, anni) {
  const r = tanPerc / 100 / 12, rata = rataMutuo(capitale, tanPerc, anni), righe = [];
  let residuo = capitale;
  for (let anno = 1; anno <= anni; anno++) {
    let interessi = 0, quota = 0;
    for (let m = 0; m < 12; m++) {
      const i = residuo * r;
      interessi += i; quota += rata - i; residuo -= rata - i;
    }
    righe.push({ anno, quota, interessi, residuo: Math.max(residuo, 0) });
  }
  return righe;
}

export const sconto = (prezzo, perc) => ({ finale: prezzo * (1 - perc / 100), risparmio: (prezzo * perc) / 100 });
export const percentualeDi = (parte, totale) => (parte / totale) * 100;
export const variazione = (da, a) => ((a - da) / da) * 100;
