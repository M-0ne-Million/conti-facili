# Conti Facili: calcolatori gratis + modelli Excel a pagamento

Un piccolo "negozio" che lavora da solo:

| Cosa | Dove sta | Come guadagna |
|---|---|---|
| **Sito gratuito**: generatore di ricevute per prestazione occasionale, ritenuta d'acconto, scorporo IVA, rata mutuo, sconti | Online, gratis, su GitHub Pages (cartelle `pagine/`, `calcoli.js`) | Porta visite da Google → vendite del modello Excel, link affiliati, pubblicità |
| **Modelli Excel**: registro prestazioni occasionali, budget familiare, affitti brevi | Cartella `etsy/` (privata, mai su GitHub) | Vendita su Etsy, Gumroad, Payhip o Lemon Squeezy |
| **Analisi di mercato** | `analisi-mercato.md` (privata) | Chi sono i clienti, concorrenti, partner a cui iscriversi |

Nessun server da gestire, nessun dato dei visitatori da custodire: i calcoli avvengono nel browser di chi usa il sito.

---

## 1. Mettere online il sito (gratis, una volta sola)

1. Crea un account gratuito su [github.com](https://github.com).
2. Installa [GitHub Desktop](https://desktop.github.com) ed entra con il tuo account.
3. In GitHub Desktop: **File → Add local repository** e scegli questa cartella.
   Quando dice che non è un repository clicca **create a repository**, poi **Create repository**.
4. Controlla nella colonna a sinistra che **non** compaiano file della cartella `etsy/`: sono esclusi apposta (sono il prodotto che vendi).
5. Clicca **Publish repository** e **togli la spunta** a "Keep this code private" (GitHub Pages gratis vuole un repository pubblico).
6. Su github.com apri il repository → **Settings → Pages** → *Source*: **GitHub Actions**.
7. In GitHub Desktop fai **Commit to main** e **Push origin**. Nella scheda **Actions** del sito di GitHub vedi la pubblicazione: in un paio di minuti il sito è su `https://TUO-UTENTE.github.io/NOME-REPOSITORY/`.
8. Scrivi quell'indirizzo in `sito.toml` alla voce `url` (deve finire con `/`), poi di nuovo Commit e Push.

Da quel momento ogni Commit + Push aggiorna il sito da solo, dopo aver controllato che i calcoli siano giusti.

**Facoltativo ma consigliato:** un dominio tuo (es. `contifacili.it`, circa 10 € l'anno) aiuta su Google.
Si collega in **Settings → Pages → Custom domain**.

## 2. Farsi trovare su Google (una volta sola, 10 minuti)

1. Vai su [Google Search Console](https://search.google.com/search-console), aggiungi il sito (proprietà "Prefisso URL")
   e scegli la verifica con **Tag HTML**. Copia solo il codice tra le virgolette di `content="..."` in `sito.toml`
   alla voce `google_verifica`, fai Commit e Push, poi clicca **Verifica**.
2. In **Sitemap** inserisci `sitemap.xml` e invia.
3. Da qui in poi Google porta le visite da solo. Servono di solito **3–6 mesi** per vedere traffico vero.

## 3. Attivare i guadagni

Apri `sito.toml` e compila i link: ogni riquadro compare sul sito solo quando il suo link c'è.

- `link_prodotto`: il link al modello Excel "Registro prestazioni occasionali" sul tuo negozio (vedi punto 4).
- `link_partita_iva` e `nome_partita_iva`: il tuo link affiliato a un servizio di commercialisti online.
- `link_mutuo` e `nome_mutuo`: il tuo link affiliato a un comparatore di mutui.
- `adsense`: il codice AdSense (`ca-pub-…`). Si chiede ad AdSense quando il sito ha già un po' di visite.
  **Prima** di inserirlo, in AdSense attiva il messaggio di consenso cookie di Google (*Privacy e messaggi → Europa*):
  in Italia senza consenso non si possono mostrare annunci. La pagina privacy si aggiorna da sola.

Quali programmi di affiliazione esistono e come iscriversi: vedi `analisi-mercato.md`.

## 4. Vendere i modelli Excel

I file sono in `etsy/`, con titoli, descrizioni, tag e immagini già pronti in `etsy/annunci.md` e `etsy/immagini/`.

- **Etsy**: apri un negozio su [etsy.com/sell](https://www.etsy.com/sell), crea un'inserzione *digitale* per ogni modello
  e carica il file `.xlsx`. Etsy trattiene circa 0,20 $ per inserzione più una commissione su ogni vendita.
  Il vantaggio: la ricerca interna di Etsy porta compratori da sola.
- **Gumroad / Payhip / Lemon Squeezy**: nessun costo fisso, solo una percentuale per vendita. Comodi come link per il sito.

Dopo la pubblicazione nessuna azione: il file viene consegnato in automatico a ogni acquisto.

## 5. Lavorare sul sito dal tuo computer

```
python3 build.py
```
genera il sito in `public/`. Per vederlo: `python3 -m http.server 8080 --directory public` e apri http://localhost:8080.
Per controllare i calcoli: `node --test`.

Le pagine sono in `pagine/` (un file per strumento), la grafica in `pagine/stile.css`, i calcoli in `calcoli.js`.

## Note fiscali (indicative, non consulenza fiscale)

Vendite continuative online e guadagni da affiliazioni e pubblicità sono redditi da dichiarare e, se l'attività diventa
abituale, possono richiedere la partita IVA. Parlane con un commercialista **prima** di attivare le vendite.
