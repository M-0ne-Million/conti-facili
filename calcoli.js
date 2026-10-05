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
export const euro = (c) => (c / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' });

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

// Affitti brevi. `lordo` = quanto paga l'ospite (esclusa la tassa di soggiorno), in centesimi.
// La cedolare secca si calcola sul lordo, senza dedurre commissioni e spese.
export function affittoBreve({ lordo, commissionePerc, pulizie = 0, spese = 0, aliquota }) {
  const commissione = Math.round((lordo * commissionePerc) / 100);
  const cedolare = Math.round((lordo * aliquota) / 100);
  return { commissione, cedolare, netto: lordo - commissione - pulizie - spese - cedolare };
}

// Tassa di soggiorno: tariffa a persona per notte × ospiti tassabili × notti (fino al massimo previsto dal comune).
export const tassaSoggiorno = (tariffa, ospiti, esenti, notti, maxNotti = 0) =>
  tariffa * Math.max(ospiti - esenti, 0) * (maxNotti > 0 ? Math.min(notti, maxNotti) : notti);

// ---------------------------------------------------------------------------
// Parametri fiscali 2026 (L. 199/2025, circolari INPS 6, 8 e 14/2026).
// Da aggiornare ogni anno dopo la legge di bilancio: è l'unico punto da toccare.
export const FISCO = {
  anno: 2026,
  scaglioni: [[28000, 23], [50000, 33], [Infinity, 43]],
  inpsDipendente: 9.19, sogliaInpsAggiuntivo: 56224, inpsAggiuntivo: 1,
  forfettario: {
    soglia: 85000,
    gruppi: [
      ['Commercio, alimentari, alloggio e ristorazione', 40],
      ['Commercio ambulante di prodotti non alimentari', 54],
      ['Intermediari del commercio', 62],
      ['Altre attività (servizi, informatica, artigianato...)', 67],
      ['Professioni, consulenza, sanità, istruzione', 78],
      ['Costruzioni e attività immobiliari', 86],
    ],
    gestioneSeparata: 26.07, massimale: 122295, minimale: 18808, sogliaAliquotaMaggiorata: 56224,
    artigiani: { fisso: 4521.36, fissoRidotto: 2941.49, aliquota: 24, aliquotaOltre: 25 },
    commercianti: { fisso: 4611.64, fissoRidotto: 3000.17, aliquota: 24.48, aliquotaOltre: 25.48 },
  },
};

export function irpefLorda(r) {
  let imposta = 0, base = 0;
  for (const [limite, aliquota] of FISCO.scaglioni) {
    if (r > base) imposta += ((Math.min(r, limite) - base) * aliquota) / 100;
    base = limite;
  }
  return imposta;
}

// Stipendio netto di un dipendente privato a tempo indeterminato, anno intero, senza familiari a carico.
// Importi in euro (non arrotondati). addizionali = percentuale regionale + comunale, facoltativa.
export function stipendioNetto(ral, addizionali = 0) {
  const inps = (ral * FISCO.inpsDipendente) / 100 + (Math.max(0, ral - FISCO.sogliaInpsAggiuntivo) * FISCO.inpsAggiuntivo) / 100;
  const r = ral - inps, lorda = irpefLorda(r);
  const detrazione = (r <= 15000 ? 1955 : r <= 28000 ? 1910 + (1190 * (28000 - r)) / 13000 : r <= 50000 ? (1910 * (50000 - r)) / 22000 : 0)
    + (r > 25000 && r <= 35000 ? 65 : 0);
  const cuneo = r > 20000 && r <= 32000 ? 1000 : r > 32000 && r <= 40000 ? (1000 * (40000 - r)) / 8000 : 0;
  const irpef = Math.max(0, lorda - detrazione - cuneo);
  const sommaEsente = r <= 20000 ? (r * (r <= 8500 ? 7.1 : r <= 15000 ? 5.3 : 4.8)) / 100 : 0;
  const integrativo = r <= 15000 && lorda > detrazione - 75 ? 1200 : 0;
  const addiz = irpef > 0 ? (r * addizionali) / 100 : 0;
  return { inps, imponibile: r, irpef, sommaEsente, integrativo, addizionali: addiz, netto: ral - inps - irpef + sommaEsente + integrativo - addiz };
}

// Regime forfettario: contributi calcolati sul reddito forfettario e dedotti nello stesso anno (ipotesi "a regime").
export function forfettario({ ricavi, coefficiente, gestione = 'separata', riduzione = false, aliquota = 15, spese = 0 }) {
  const F = FISCO.forfettario, reddito = (ricavi * coefficiente) / 100;
  let contributi;
  if (gestione === 'separata') contributi = (Math.min(reddito, F.massimale) * F.gestioneSeparata) / 100;
  else {
    const g = F[gestione], fasciaBase = Math.max(0, Math.min(reddito, F.sogliaAliquotaMaggiorata) - F.minimale);
    const eccedenza = (fasciaBase * g.aliquota) / 100 + (Math.max(0, Math.min(reddito, F.massimale) - F.sogliaAliquotaMaggiorata) * g.aliquotaOltre) / 100;
    contributi = (riduzione ? g.fissoRidotto : g.fisso) + eccedenza * (riduzione ? 0.65 : 1);
  }
  const imponibile = Math.max(0, reddito - contributi), imposta = (imponibile * aliquota) / 100;
  return { reddito, contributi, imponibile, imposta, netto: ricavi - spese - contributi - imposta };
}
