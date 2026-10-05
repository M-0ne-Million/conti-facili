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
    ('calcolo-sconto-percentuale', 'Calcolo sconto e percentuali online',
     'Calcola il prezzo scontato, che percentuale è un numero rispetto a un altro e le variazioni percentuali. Con formule ed esempi.'),
]
ALTRE = [
    ('index', f"{C['nome']}: calcolatori e ricevute gratis in italiano",
     'Strumenti gratuiti in italiano: ricevuta per prestazione occasionale, ritenuta d\'acconto, scorporo IVA, rata mutuo, sconti e percentuali.'),
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
}
affiliati = any([G['link_prodotto'], G['link_partita_iva'], G['link_mutuo']])
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

indirizzi = []
for nome, titolo, descrizione in STRUMENTI + ALTRE:
    radice = nome == 'index'
    base, canonical = ('', URL) if radice else ('../', f'{URL}{nome}/')
    comuni = {'base': base, 'titolare': html.escape(C['titolare']), 'email': html.escape(C['email']),
              'privacy_pubblicita': privacy_pubblicita, **box}
    corpo = Template((PAGINE / f'{nome}.html').read_text('utf-8')).substitute(comuni)
    jsonld = ({'@context': 'https://schema.org', '@type': 'WebSite', 'name': C['nome'], 'url': URL, 'inLanguage': 'it'} if radice else
              {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': titolo, 'url': canonical, 'description': descrizione,
               'applicationCategory': 'FinanceApplication', 'operatingSystem': 'Any', 'inLanguage': 'it',
               'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'}})
    pagina = layout.substitute(
        titolo=html.escape(titolo), descrizione=html.escape(descrizione), canonical=html.escape(canonical),
        nome_sito=html.escape(C['nome']), base=base or './', corpo=corpo, css=css,
        adsense=adsense + (f'<meta name="google-site-verification" content="{html.escape(C["google_verifica"])}">' if C['google_verifica'] else ''),
        jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'), anno=date.today().year,
        menu=''.join(f'<li><a href="{base}{n}/">{html.escape(t.split(":")[0])}</a></li>' for n, t, _ in STRUMENTI),
        nota_affiliati=' Alcuni link sono sponsorizzati: se acquisti tramite quei link il sito può ricevere una commissione.' if affiliati else '')
    dest = OUT / 'index.html' if radice else OUT / nome / 'index.html'
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(pagina, 'utf-8')
    indirizzi.append(canonical)

(OUT / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{html.escape(u)}</loc></url>\n' for u in indirizzi) + '</urlset>\n', 'utf-8')
(OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {URL}sitemap.xml\n', 'utf-8')
print(f'Sito generato in {OUT} ({len(indirizzi)} pagine)')
