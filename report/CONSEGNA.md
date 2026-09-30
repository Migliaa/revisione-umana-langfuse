# Consegna — progetto `giudice`

Per la sessione del sito. Tutto quello che serve sta in `Progetti/giudice/report/report.md`.

## Nome del prodotto

Il prodotto va presentato come **"Revisione Umana su Langfuse"**, non come "giudice" né come
"Ultima Parola" (nome precedente, scartato il 2026-09-29 perché suonava da slogan invece di dire
cosa fa il prodotto). "giudice" resta solo il nome interno della cartella locale — non deve
comparire nel testo rivolto al pubblico del sito.

## Formato di consegna

Diverso da `tassonomia` e `metodo`: qui il centro del progetto è lo strumento stesso, non
un'analisi da leggere (deciso in `CONTEXT.md`). Non c'è un formato lungo prosa+figure — solo il
report breve con sei sezioni (problema, destinatari, funzionalità, personalizzazione, prova su
10 richieste, codice), senza sezioni da dividere fra home e pubblicazione estesa: è già la lunghezza
di un blocco da home.

## Provalo tu stesso

L'interfaccia ha una **modalità demo**: se non trova credenziali Langfuse configurate (caso
normale per chiunque clona il repo senza un proprio progetto Langfuse) mostra tre item fittizi
al posto di un errore, con un banner che lo dichiara esplicitamente. Chi vuole provarlo — un
recruiter, chiunque legga il sito — clona il repo ed esegue `npm install && npm run dev` dentro
`frontend/`: nessuna configurazione richiesta. Un popup all'apertura spiega cosa succede dietro
le quinte (il collegamento a Langfuse, a cosa serve all'ingegnere AI), non come si usano i
pulsanti — resta implicito che chi arriva sappia usare un'interfaccia web.

Se la pagina del sito rimanda a "provalo tu stesso", questo comando è il modo corretto di
formularlo, dato che non esiste un link pubblico (vedi sotto).

Non leggere `DIARIO.md`, `CONTEXT.md`, `BRIEF.md`, né `frontend/`/`backend/`: sono lavoro interno.

## Vincoli sul testo

Nessuna sezione pre-approvata da riscrivere: il report è nuovo, non derivato da un testo
precedente. Tono neutro, non promozionale — Andrea ha chiesto esplicitamente di togliere ogni
frase che suoni come pubblicità del prodotto, mantenere quella scelta se il testo viene adattato
al taglio del sito.

## Nessuna figura

Il report non ha figure. Se la pagina del sito ne vuole una, esiste uno screenshot reale
dell'interfaccia in modalità demo (`docs/schermata.png`, 1440 px), in cui compare solo il nome
"Revisione Umana su Langfuse".

## Cose da sapere

- Il progetto è un prototipo che gira in locale (`frontend/` + `backend/`), non ha un link
  pubblico: se la pagina del sito promette un demo raggiungibile, va chiarito che si tratta di
  uno strumento eseguibile, non hostato (deciso in `CONTEXT.md`: il deploy vero è rimandato).
- Non c'è login né invio email reale nel prodotto — scelte esplicite, non lacune da segnalare
  come limite.
- Repo: https://github.com/Migliaa/revisione-umana-langfuse (rinominato il 2026-09-29, era
  `InterfacciaLangfuse`; GitHub reindirizza il vecchio URL).

## Da aggiornare in `SitoPersonale/PROGETTI.md`

La riga va aggiornata a "completato", col nome **"Revisione Umana su Langfuse"** (non più "Ultima
Parola") — la sessione del sito decide la formulazione esatta.

## Coerenza con il README (2026-09-30)

I numeri della sezione «Prova su 10 richieste» sono gli stessi del `README.md` del repository
(10 richieste, giudice automatico 8 «sì» e 2 «da rivedere» sul preventivo, 10 «sì» sul messaggio,
6 richieste giudicate dal revisore con 5 accordi e 1 disaccordo, 42 e 22 test). Se la pagina del
sito li riporta, devono restare identici e conservare la riserva sull'origine dei giudizi del
revisore (inseriti dall'autore con Claude), e la pagina deve linkare il repository. Lo screenshot
è `docs/schermata.png` nel repository.
