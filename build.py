"""Genera il sito statico in public/ dalle pagine in pagine/ e dalla configurazione in sito.toml.
Solo libreria standard: python3 build.py"""
import html
import json
import shutil
import tomllib
from datetime import date
from pathlib import Path
from string import Template

QUI = Path(__file__).parent
PAGINE, OUT = QUI / 'pagine', QUI / 'public'
C = tomllib.loads((QUI / 'sito.toml').read_text('utf-8'))
G = C['guadagni']
URL = C['url']

# (file, titolo, descrizione): l'ordine è quello del menu
STRUMENTI = [
    ('ricevuta-prestazione-occasionale', 'Ricevuta prestazione occasionale: generatore gratis in PDF',
     'Crea gratis la ricevuta per prestazione occasionale in PDF: ritenuta d\'acconto 20% e marca da bollo calcolate in automatico. Senza registrazione.'),
    ('calcolo-ritenuta-acconto', 'Calcolo ritenuta d\'acconto 20%: lordo e netto',
     'Calcola online la ritenuta d\'acconto del 20%: dal lordo al netto e dal netto al lordo, con esempi e spiegazioni semplici.'),
    ('scorporo-iva', 'Scorporo IVA online: calcolo IVA al 22%, 10%, 5% e 4%',
     'Scorpora l\'IVA da un prezzo o aggiungila a un importo netto. Calcolatore gratuito con aliquote 22%, 10%, 5% e 4% e formula spiegata.'),
    ('calcolo-rata-mutuo', 'Calcolo rata mutuo con piano di ammortamento',
     'Calcola la rata mensile del mutuo, gli interessi totali e il piano di ammortamento alla francese anno per anno. Gratis e immediato.'),
    ('calcolo-stipendio-netto', 'Calcolo stipendio netto 2026: dalla RAL al netto mensile',
     'Calcola lo stipendio netto 2026 dalla RAL: IRPEF con il nuovo scaglione al 33%, contributi INPS, taglio del cuneo fiscale e netto al mese su 13 o 14 mensilità.'),
    ('calcolo-tasse-forfettario', 'Calcolo tasse regime forfettario 2026',
     'Calcola contributi INPS e imposta sostitutiva del regime forfettario 2026 (15% o 5%), con coefficienti di redditività e riduzione del 35%. Vedi quanto ti resta.'),
    ('calcolo-affitti-brevi', 'Affitti brevi 2026: calcolo cedolare secca e guadagno netto',
     'Calcola quanto ti resta di un affitto breve su Airbnb o Booking: commissioni, pulizie e cedolare secca al 21% o 26% con le regole 2026.'),
    ('calcolo-tassa-di-soggiorno', 'Calcolo tassa di soggiorno per affitti brevi',
     'Calcola la tassa di soggiorno per gli ospiti: tariffa a persona per notte, esenzioni e notti massime, con esempi per Roma, Milano, Firenze, Venezia e Napoli.'),
    ('calcolo-codice-fiscale', 'Calcolo codice fiscale online e verifica',
     'Calcola il codice fiscale da nome, cognome, data e comune di nascita, oppure verifica se un codice fiscale è corretto. Gratis, senza inviare dati.'),
    ('verifica-iban', 'Verifica IBAN online: controlla se è corretto',
     'Controlla se un IBAN è scritto correttamente prima di un bonifico: cifre di controllo, lunghezza, ABI e CAB. Il controllo avviene sul tuo dispositivo.'),
    ('calcolo-imu', 'Calcolo IMU: importo, acconto e saldo',
     'Calcola l\'IMU dalla rendita catastale: coefficienti per categoria, aliquota del Comune, quota e mesi di possesso, acconto di giugno e saldo di dicembre.'),
    ('calcolo-interesse-composto', 'Calcolo interesse composto e PAC',
     'Calcola quanto può crescere un capitale con l\'interesse composto e un piano di accumulo mensile, con le tasse italiane sui guadagni (26% o 12,5%).'),
    ('calcolo-sconto-percentuale', 'Calcolo sconto e percentuali online',
     'Calcola il prezzo scontato, che percentuale è un numero rispetto a un altro e le variazioni percentuali. Con formule ed esempi.'),
]
GUIDE = [
    ('guida-prestazione-occasionale', 'Prestazione occasionale 2026: guida completa',
     'Ricevuta, ritenuta del 20%, marca da bollo, soglia dei 5.000 € e contributi INPS: come funziona la prestazione occasionale nel 2026 e come si dichiara.'),
    ('guida-partita-iva-forfettaria', 'Partita IVA forfettaria 2026: costi, tasse e come aprirla',
     'Requisiti, soglie, contributi INPS, imposta al 15% o 5% e costi: come aprire la partita IVA forfettaria nel 2026, con un esempio completo.'),
    ('guida-affitti-brevi-2026', 'Affitti brevi 2026: tasse, cedolare secca e obblighi',
     'Cedolare secca al 21% o 26%, ritenuta dei portali, CIN, Alloggiati Web e tassa di soggiorno: le regole 2026 degli affitti brevi, con un esempio.'),
]
ALTRE = [
    ('index', f"{C['nome']}: calcolatori e ricevute gratis in italiano",
     'Strumenti gratuiti in italiano: ricevuta per prestazione occasionale, ritenuta d\'acconto, scorporo IVA, rata mutuo, sconti e percentuali.'),
    ('incorpora', f"Metti i calcolatori sul tuo sito | {C['nome']}",
     'Aggiungi gratis i calcolatori di Conti Facili al tuo sito o blog: ricevute, ritenuta, IVA, mutuo, stipendio, forfettario, affitti brevi e altri.'),
    ('privacy', f"Privacy | {C['nome']}", f"Informativa privacy di {C['nome']}."),
]


def link(url, testo):
    return f'<a class="bottone" href="{html.escape(url)}" rel="sponsored noopener" target="_blank">{html.escape(testo)}</a>'


box = {
    'box_prodotto': G['link_prodotto'] and (
        '<div class="box prodotto"><strong>Fai tante ricevute? Prova il modello Excel completo</strong>'
        '<p>Registro di tutte le prestazioni, ricevute numerate in automatico, totale dell\'anno con avviso vicino ai 5.000 €, '
        f"crediti da incassare. Funziona con Excel e Google Fogli. {html.escape(G['prezzo_prodotto'])}, una volta sola.</p>"
        f"{link(G['link_prodotto'], 'Scopri il modello Excel')}</div>"),
    'box_piva': G['link_partita_iva'] and (
        '<div class="box partner"><strong>Il lavoro sta diventando continuativo?</strong>'
        '<p>Se i clienti diventano abituali può servire la partita IVA. Un commercialista online ti dice in pochi minuti se ti conviene il forfettario.</p>'
        f"{link(G['link_partita_iva'], 'Chiedi a ' + (G['nome_partita_iva'] or 'un commercialista online'))}"
        '<p class="nota">Link sponsorizzato.</p></div>'),
    'box_mutuo': G['link_mutuo'] and (
        '<div class="box partner"><strong>Vuoi una rata più bassa?</strong>'
        '<p>Confronta le offerte di mutuo di più banche gratis, con il TAEG già calcolato.</p>'
        f"{link(G['link_mutuo'], 'Confronta i mutui' + (' su ' + G['nome_mutuo'] if G['nome_mutuo'] else ''))}"
        '<p class="nota">Link sponsorizzato.</p></div>'),
    'box_host': G['link_host'] and (
        '<div class="box partner"><strong>Gestisci più di un alloggio?</strong>'
        '<p>Un software per host sincronizza i calendari dei portali, evita le doppie prenotazioni e invia i messaggi agli ospiti in automatico.</p>'
        f"{link(G['link_host'], 'Prova ' + (G['nome_host'] or 'un software per host'))}"
        '<p class="nota">Link sponsorizzato.</p></div>'),
}
affiliati = any([G['link_prodotto'], G['link_partita_iva'], G['link_mutuo'], G['link_host']])
adsense = G['adsense'] and (
    f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={html.escape(G["adsense"])}" crossorigin="anonymous"></script>')
privacy_pubblicita = (
    '<h2>Pubblicità</h2><p>Il sito mostra annunci di Google AdSense. Google e i suoi partner possono usare cookie per mostrare e misurare gli annunci, '
    'solo dopo il tuo consenso, che puoi dare o negare nel messaggio mostrato alla prima visita. Maggiori informazioni: '
    '<a href="https://policies.google.com/technologies/ads?hl=it">come Google usa i cookie nella pubblicità</a>.</p>'
    if G['adsense'] else '<p>Il sito non usa cookie né strumenti di statistica o pubblicità.</p>')

css = (PAGINE / 'stile.css').read_text('utf-8')
layout = Template((PAGINE / 'layout.html').read_text('utf-8'))
shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir()
shutil.copy(QUI / 'calcoli.js', OUT)
shutil.copytree(PAGINE / 'font', OUT / 'font')
shutil.copytree(PAGINE / 'dati', OUT / 'dati')

# Codici da copiare per incorporare i calcolatori in altri siti (pagina /incorpora/).
codici = ''.join(
    f'<h2>{html.escape(t.split(":")[0])}</h2><textarea readonly rows="4" aria-label="Codice per {html.escape(t.split(":")[0])}">'
    + html.escape(f'<iframe src="{URL}incorpora/{n}/" title="{t.split(":")[0]}" width="100%" height="720" style="border:0" loading="lazy"></iframe>\n'
                  f'<p>Calcolatore gratuito: <a href="{URL}{n}/">{t.split(":")[0]}</a> di {C["nome"]}</p>')
    + '</textarea><button type="button" class="copia">Copia il codice</button>' for n, t, _ in STRUMENTI)


# Tassa di soggiorno città per città: un file di dati, una pagina per città, un indice per regione.
# I dati sono controllati da sito.test.js, che nel workflow gira prima della pubblicazione.
testo = lambda x: html.escape(x, quote=False)   # nei nodi di testo l'apostrofo non va trasformato
CITTA = json.loads((PAGINE / 'dati' / 'tassa-soggiorno.json').read_text('utf-8'))
virgola = lambda x: f'{x:.2f}'.replace('.', ',')
importo = lambda c: ('fino a ' if c.get('tetto') else '') + f'{virgola(c["tariffa"])} €'   # tetto: si paga una % del prezzo, con un massimo
opzioni_citta = ''.join(f'          <option value="{c["tariffa"]}|{c["notti_max"]}|{c["eta_esenzione"] or ""}">{testo(c["nome"])}</option>\n'
                        for c in sorted(CITTA, key=lambda c: c['nome']))


def genera(nome, titolo, descrizione, incorporato=False, modello=None, extra=None):
    radice = nome == 'index'
    base = '' if radice else '../' * (nome.count('/') + 1 + incorporato)
    canonical = URL if radice else f'{URL}{nome}/'
    comuni = {'base': base, 'titolare': html.escape(C['titolare']), 'email': html.escape(C['email']),
              'privacy_pubblicita': privacy_pubblicita, 'codici': codici, 'opzioni_citta': opzioni_citta, **box, **(extra or {})}
    corpo = Template((PAGINE / f'{modello or nome}.html').read_text('utf-8')).substitute(comuni)
    jsonld = ({'@context': 'https://schema.org', '@type': 'WebSite', 'name': C['nome'], 'url': URL, 'inLanguage': 'it'} if radice else
              {'@context': 'https://schema.org', '@type': 'Article', 'headline': titolo, 'description': descrizione, 'url': canonical,
               'inLanguage': 'it', 'dateModified': date.today().isoformat(), 'publisher': {'@type': 'Organization', 'name': C['nome']}}
              if nome.startswith('guida-') else
              {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': titolo, 'url': canonical, 'description': descrizione,
               'applicationCategory': 'FinanceApplication', 'operatingSystem': 'Any', 'inLanguage': 'it',
               'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'}})
    pagina = layout.substitute(
        titolo=html.escape(titolo), descrizione=html.escape(descrizione), canonical=html.escape(canonical),
        nome_sito=html.escape(C['nome']), base=base or './', corpo=corpo, css=css,
        adsense=adsense + (f'<meta name="google-site-verification" content="{html.escape(C["google_verifica"])}">' if C['google_verifica'] else ''),
        jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'), anno=date.today().year,
        menu=''.join(f'<li><a href="{base}{n}/">{html.escape(t.split(":")[0])}</a></li>' for n, t, _ in STRUMENTI + GUIDE),
        nota_affiliati=' Alcuni link sono sponsorizzati: se acquisti tramite quei link il sito può ricevere una commissione.' if affiliati else '',
        classe='incorporato' if incorporato else '',
        robots='<meta name="robots" content="noindex">' if incorporato else '',
        firma=f'<p class="firma-widget">Calcolatore gratuito di <a href="{html.escape(canonical)}" target="_blank" rel="noopener">{html.escape(C["nome"])}</a></p>' if incorporato else '')
    dest = OUT / 'index.html' if radice else OUT / ('incorpora' if incorporato else '') / nome / 'index.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(pagina, 'utf-8')
    return canonical


indirizzi = [genera(*p) for p in STRUMENTI + GUIDE + ALTRE]

regioni = sorted({c['regione'] for c in CITTA})
indirizzi.append(genera('tassa-di-soggiorno', 'Tassa di soggiorno 2026: tariffe nelle città italiane',
    f'Tariffe 2026 della tassa di soggiorno per case vacanza e affitti brevi in {len(CITTA)} città italiane, con esenzioni, notti massime e calcolatore.',
    extra={'numero': len(CITTA), 'elenco': ''.join(
        f'<h2>{testo(r)}</h2><ul class="registro">' + ''.join(
            f'<li><a href="{c["slug"]}/"><strong>{testo(c["nome"])}</strong><span>{importo(c)} a persona per notte</span></a></li>'
            for c in CITTA if c['regione'] == r) + '</ul>' for r in regioni)}))
for c in CITTA:
    vicine = [v for v in CITTA if v['regione'] == c['regione'] and v is not c]
    indirizzi.append(genera(
        f'tassa-di-soggiorno/{c["slug"]}', f'Tassa di soggiorno {c["nome"]} 2026: tariffa e calcolo',
        f'Tassa di soggiorno a {c["nome"]} per case vacanza e affitti brevi: {importo(c)} a persona per notte, '
        f'esenzioni e notti massime. Calcola il totale per i tuoi ospiti.',
        modello='tassa-citta', extra={
            'nome': testo(c['nome']), 'regione': testo(c['regione']), 'tariffa_it': virgola(c['tariffa']), 'tariffa_testo': importo(c),
            'notti_max': c['notti_max'], 'note': testo(c['note']), 'fonte': html.escape(c['fonte']),
            'notti_testo': f'fino a {c["notti_max"]} notti (dettagli nelle note)' if c['notti_max'] else 'nessun limite trovato',
            'eta_testo': f'fino a {c["eta_esenzione"]} anni (vedi note)' if c['eta_esenzione'] else 'non indicata',
            'tipo_fonte_testo': 'sito del Comune' if c['tipo_fonte'] == 'comune' else 'fonte di settore',
            'verificato_it': '/'.join(reversed(c['verificato'].split('-'))),
            'altre': ' '.join(f'<a href="../{v["slug"]}/">{testo(v["nome"])}</a>' for v in vicine) or 'Nessun\'altra città della regione in elenco.'}))
for p in STRUMENTI:
    genera(*p, incorporato=True)   # fuori dalla sitemap e con noindex: contano i link verso le pagine vere

(OUT / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{html.escape(u)}</loc></url>\n' for u in indirizzi) + '</urlset>\n', 'utf-8')
(OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {URL}sitemap.xml\n', 'utf-8')
print(f'Sito generato in {OUT} ({len(indirizzi)} pagine)')
