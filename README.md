# Revisione Umana su Langfuse

Interfaccia che permette a un revisore non tecnico di dare un verdetto su output generati da un
agente — qui, preventivi e messaggi cliente — prima che raggiungano il cliente vero, mantenendo il
collegamento con Langfuse così un ingegnere AI può usare quei verdetti per ricalibrare l'agente e
il giudice automatico che lo precede.

<!-- screenshot: schermata a tre colonne (richiesta, preventivo, verdetti automatici) + area di
lavoro sotto (giudizio, messaggio editabile) — va catturata lanciando `npm run dev` in
`frontend/` con un item di prova in coda -->

## Architettura

```
richiesta cliente → esecutore (agente) → giudice automatico (LLM-as-judge) → coda Langfuse
                                                                                   │
                                                                    giudice umano (questa interfaccia)
                                                                                   │
                                                                    punteggi tracciati su Langfuse
```

- **Esecutore**: genera da zero un preventivo (tabella) e un messaggio cliente (email
  personalizzata) a partire da una richiesta cliente.
- **Giudice automatico**: valuta preventivo e messaggio separatamente, prima che arrivino
  all'umano.
- **Giudice umano** (questa interfaccia): vede richiesta, preventivo, messaggio e i verdetti
  automatici affiancati; registra quattro punteggi distinti — esito e accordo col giudice
  automatico, per ciascuna delle due dimensioni — invece di un verdetto unico, per poter isolare
  se a sbagliare è l'esecutore o il giudice automatico.
- Backend Python (SDK Langfuse) per esecutore, giudice automatico e inserimento in coda.
  Frontend Next.js/TypeScript, adattato dal template ufficiale
  [`langfuse-examples/custom-annotation-ui`](https://github.com/langfuse/langfuse-examples/tree/main/applications/custom-annotation-ui),
  per l'interfaccia del giudice umano.

## Provalo

```bash
cd frontend
npm install
npm run dev
```

Senza credenziali Langfuse configurate parte in **modalità demo**: tre item fittizzi al posto di
un errore, con un banner che lo dichiara esplicitamente. Con un progetto Langfuse vero, le
variabili d'ambiente (`LANGFUSE_HOST`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`) attivano la
modalità reale.

## Decisioni degne di nota

- **Quattro punteggi separati, non un verdetto unico** — permette di distinguere se sbaglia
  l'esecutore o il giudice automatico invece di dedurlo da un commento libero.
- **Layout scelto dopo un prototipo throwaway**, non a tavolino: tre varianti provate con dati
  finti (stack mobile a card, annotazione inline riga per riga, tre colonne + area di lavoro),
  scelta la terza perché il giudice umano userebbe lo strumento più volte al giorno da postazione
  fissa, dove separare "cosa guardo" da "cosa faccio" regge meglio di una sequenza verticale.
- **White-label esplicito**: lo strumento (bottoni, colori di stato) è neutro; solo il documento
  preventivo e il messaggio cliente — il contenuto che uscirebbe verso il cliente vero — portano
  il profilo dell'azienda finta.
- **Scrittura idempotente dei quattro punteggi** (`Promise.allSettled` + id deterministico
  `{idTraccia}-{nome}`): una code review con più agenti in parallelo aveva trovato che un retry
  dopo un fallimento parziale duplicava punteggi già scritti.
- **Esecutore e giudice automatico girano su Claude Code non interattivo** (uso dell'abbonamento),
  non su una API a consumo — a costo di dover vincolare bene l'output testuale nel prompt invece
  di avere un JSON strutturato garantito.

## Limiti, dichiarati

Prototipo dimostrativo: poche ripetizioni bastano a verificare che il collegamento con Langfuse
funzioni end-to-end, non a misurare quanto sia accurato il giudice automatico o l'effetto della
ricalibrazione — servirebbe scala e una misura statistica, assenti qui. Nessun login, nessun invio
email reale, nessun deploy pubblico: scelte esplicite per restare un prototipo, non lacune
scoperte in corsa. Catalogo e profilo aziendale sono dati caricati da una fonte separata e
sostituibile, così un'azienda reale potrebbe collegare i propri senza toccare la pipeline.

## Licenza

MIT — vedi [`LICENSE`](LICENSE).
