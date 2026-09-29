# Diario

Una riga per sessione, memoria grezza del processo. Non letto dalla sessione del sito: solo
`report/report.md` e `CONSEGNA.md` lo sono.

- **2026-09-10 → 2026-09-15, grilling + spec + ticket.** Da `BRIEF.md` (opzioni non ancora
  scelte) a un progetto completamente specificato tramite grilling Matt Pocock a più round:
  scelta la strada 1 del brief (template `langfuse-examples/custom-annotation-ui`, adattato),
  caso d'uso controllo preventivi, struttura a doppio giudice (esecutore → giudice automatico →
  giudice umano) con doppio verdetto/giudizio (preventivo, messaggio cliente) invece di uno
  unico — per poter capire dove sbaglia l'esecutore. Deciso di eseguire esecutore e giudice
  automatico tramite l'abbonamento Claude (`claude -p` non interattivo) invece di una chiave API,
  per azzerare i costi. Deciso di separare il documento preventivo (PDF) e il messaggio cliente:
  contenuto interpretato dall'esecutore, documento come rendering deterministico a valle, senza
  LLM. Fatto un prototipo throwaway (3 varianti di layout per il giudizio umano, dati finti),
  archiviato sul branch `prototype/giudice-ui`; vinta la variante "tre colonne + area di lavoro".
  Esclusa la ricalibrazione del giudice automatico dallo scope, dopo aver verificato che non
  esiste un metodo standard riconosciuto in modo unanime (industria: editing manuale del prompt;
  accademia: fine-tuning/preference optimization; filone recente: calibrazione statistica —
  nessuno prevale). Scritti spec (issue #1) e ticket (#2–#5, con dipendenze a blocchi).
- **2026-09-15, ticket #2 — pipeline.** Implementato `backend/giudice_pipeline/`: esecutore
  (genera preventivo + messaggio cliente da una richiesta), giudice automatico (doppio verdetto),
  gateway Langfuse (score config, coda, tracciamento). TDD, 32 test, mypy pulito. Code review con
  8 agenti in parallelo (angoli A-H): 7 problemi trovati e corretti (validazione mancante,
  paginazione assente su Langfuse, duplicazione di `_formatta_catalogo`, early-return che
  saltava il setup di coda/config, tra gli altri). Rotto e risolto un problema reale solo al
  primo run end-to-end con Claude vero (non mockato): `claude -p` senza `--safe-mode` scopriva il
  `CLAUDE.md` di questo stesso repo e usciva dal ruolo di esecutore/giudice, rispondendo di sé
  invece di generare l'output richiesto. Tentato prima `--bare` (risolve il problema ma forza la
  chiave API, incompatibile con l'abbonamento); risolto con `--safe-mode` (disattiva
  CLAUDE.md/skill/plugin, autenticazione via abbonamento intatta). Verificato con run reale
  contro Langfuse Cloud. Noto ma non risolto: rilanciare `run_pipeline.py` sulle stesse richieste
  non è idempotente su punteggi/coda (solo su config/coda). Commit `aa210ba`, `39173de`.
- **2026-09-15, ticket #3 — rendering documento preventivo (PDF).** Implementato
  `backend/giudice_pipeline/documento.py`: rendering deterministico con `reportlab`, nessun
  import di `claude_cli` (verificato via AST nei test, non solo a occhio). Profilo azienda finto
  (ACME) in `data/profilo_azienda.json`, caricato con lo stesso pattern di validazione già usato
  per catalogo e richieste. Il PDF viene referenziato sulla traccia Langfuse come media
  (`LangfuseMedia`, content-type `application/pdf`) in una nuova osservazione
  `documento-preventivo`, verificato con una chiamata reale a Langfuse che il riferimento è
  effettivamente recuperabile dalla traccia. TDD (9 nuovi test), mypy pulito. Code review con 8
  agenti in parallelo: trovato e corretto un bug reale (la larghezza delle colonne della tabella,
  175mm, eccedeva l'area utile della pagina A4 con i margini di default di reportlab, 159.2mm —
  verificato programmaticamente, non solo per ispezione) e un rischio di crash (nessuna
  validazione di tipo sui campi numerici del preventivo prima di formattarli/sommarli — esteso
  `_valida_preventivo` in `esecutore.py` per rifiutare tipi non numerici, fail-fast dove i dati
  vengono prodotti, non dove vengono renderizzati). Ristrutturata la firma di `esegui_pipeline`:
  invece di due parametri opzionali (`genera_documento_preventivo`, `profilo_azienda`) legati da
  un `assert` a runtime (disattivabile con `python -O`), un solo parametro (`genera_documento`)
  già bindato al profilo azienda in `run_pipeline.py` tramite `functools.partial` — lo stato
  illegale "uno presente, l'altro no" diventa irrappresentabile. Estratto un helper `_osserva` nel
  gateway per eliminare la ripetizione di tre blocchi `with ...: pass` identici. Deduplicata la
  validazione di campi obbligatori in `dati.py` (stesso pattern ripetuto tre volte) in un helper
  `_valida_campi`. Notato, in fase di review, che questo file (`DIARIO.md`) non esisteva ancora
  nonostante il CLAUDE.md di progetto lo richieda esplicitamente da subito — creato ora,
  recuperando anche la sessione del ticket #2 a memoria/da `CONTEXT.md` e dai commit, dato che il
  diario grezzo di quella sessione non era stato scritto in tempo reale.
- **2026-09-16, ticket #4 — interfaccia, lettura dell'item di coda.** Scaffolding da zero di
  `frontend/` (Next.js 16 App Router, TypeScript, primo codice TS del repo — finora solo Python).
  Riletto il prototipo throwaway (`prototype/giudice-ui`, variante A vinta) per replicarne
  esattamente la struttura a tre colonne + area di lavoro. `lib/langfuse.ts`: niente SDK
  `langfuse` per Node, chiamate dirette `fetch` alle stesse API REST pubbliche già usate dal
  backend Python (Basic Auth public:secret) — risolve la coda per nome, prende il primo item
  `PENDING` (non ancora giudicato dall'umano), legge le osservazioni della traccia per nome
  (`pipeline-preventivo`, `esecutore`, `giudice-automatico`, `documento-preventivo`), risolve il
  riferimento media del PDF (`GET /api/public/media/{id}`) in un URL scaricabile per l'anteprima.
  Scelta deliberata: tutta questa logica gira lato server (Server Component), le chiavi Langfuse
  non arrivano mai al client. `lib/catalogo.ts` legge `backend/data/catalogo.json` direttamente
  da filesystem — stesso file della pipeline Python, nessuna duplicazione. Componente
  `ItemDaRivedereView` presentazionale puro (riceve dati già mappati, zero terminologia Langfuse),
  con l'area di lavoro (giudizio, invio) resa in markup ma disabilitata: l'interattività è
  ticket #5, qui va solo predisposto il layout. Test (Vitest + Testing Library): mockano
  `global.fetch` per le quattro chiamate Langfuse e verificano che tutti i blocchi (richiesta,
  tabella, verdetti separati, catalogo dietro toggle, assenza di terminologia tecnica) si
  rendano coi dati giusti; test separati su `caricaProssimoItemDaRivedere` per i casi di coda
  assente, item assente, documento assente, osservazioni mancanti. `next.config.ts` carica le
  credenziali da `../.env` (unico file, condiviso col backend) con `process.loadEnvFile`, non un
  `.env.local` duplicato. Verificato end-to-end con `next dev` contro Langfuse Cloud vero: la
  pagina mostra un item reale rimasto in coda dal test manuale del ticket #3 (richiesta, tabella,
  anteprima PDF in iframe, verdetti, catalogo a comparsa) — nessun errore console, nessuna
  chiamata Langfuse fallita. `jsdom` fissato a 29.1.1 (non l'ultima, 30.x, che richiede una
  versione di Node più recente di quella installata). `typescript` fissato a 5.9.3 (non l'ultima
  major, 7.x, appena rilasciata e non ancora verificata con l'ecosistema Next.js/testing usato
  qui). Code review con 8 agenti in parallelo: 6 problemi trovati e corretti — un crash reale
  (`outputDocumento.documento.match()` senza controllare che il campo fosse una stringa presente,
  scatenabile da una finestra di ingestion asincrona lato Langfuse), cast TypeScript senza
  validazione a runtime su esecutore/giudice (a differenza del backend, che valida esplicitamente
  gli stessi campi — aggiunta validazione equivalente lato TS), stessa mancanza di validazione nel
  caricamento del catalogo (allineato a `_valida_campi` del backend), "coda non trovata" e "coda
  vuota" collassati nello stesso `null` (un errore di configurazione si presentava come stato
  normale — ora la coda mancante solleva un errore esplicito), due mappe parallele
  etichetta/classe per lo stesso esito unificate, helper di mock `fetch` duplicato nei due file di
  test estratto in `tests/mock-langfuse.ts`. Rifiutate esplicitamente altre proposte emerse in
  review (uso dell'SDK Langfuse Node al posto di `fetch` diretto, caching delle chiamate,
  parallelizzazione della catena coda→traccia→media): la catena è per costruzione sequenziale
  (ogni chiamata usa l'id restituito dalla precedente), il traffico atteso è un singolo revisore
  umano, e introdurre l'SDK per sole quattro GET non avrebbe ridotto rischio reale.
- **2026-09-16, ticket #5 — giudizio umano, modifica messaggio, invio e avanzamento.** Resa
  interattiva l'area di lavoro di `ItemDaRivedereView.tsx`, finora statica: i quattro giudizi
  (esito+commento preventivo, esito+commento messaggio, accordo preventivo, accordo messaggio)
  con stato React, commento obbligatorio se l'esito non è "sì", pulsante di registrazione
  abilitato solo a moduli completi; campo messaggio cliente reso modificabile; "Invia mail" resta
  uno stub (conferma a schermo, nessuna chiamata di rete, per design — fuori scope come login e
  deploy). Estesa `trovaProssimaTracciaDaGiudicare` (rinominata `trovaProssimoItemCoda`) per
  restituire anche l'id dell'item di coda, non solo il trace id: serviva per la `PATCH .../items/
  {id}` che marca l'item `COMPLETED` dopo il giudizio. Aggiunta `registraGiudizioUmano` in
  `lib/langfuse.ts`: scrive i quattro score umani (`source: ANNOTATION`, a differenza dei
  punteggi automatici del backend con `source: API`) risolvendo i `configId` per nome da
  `GET /api/public/score-configs` (stesse config già create da `assicura_score_configs()` lato
  backend, non ricreate), marca l'item completato, poi ricarica il prossimo item della coda.
  Introdotta `frontend/lib/azioni.ts` (`"use server"`) come unico punto di ingresso lato client
  per l'azione di scrittura, così le chiavi Langfuse restano lato server come nel ticket #4 —
  passata come prop (server action come prop a un client component) invece che importata
  direttamente nel componente, per poter testare quest'ultimo passando un mock plain async
  function senza dover mockare il modulo server. TDD sulla logica di validazione dei quattro
  giudizi prima del componente. 18 test (9 nuovi), `tsc`/`next build` puliti. Verificato
  end-to-end più volte contro Langfuse Cloud reale con `next start` (non `next dev`: l'HMR via
  websocket non funziona nell'ambiente del pannello browser di questa sessione e produceva un
  loop di reload continuo che impediva l'idratazione React — non un bug del codice, un limite
  dell'ambiente di anteprima; annotato per non ripetere il debug la prossima volta) — un giudizio
  completo scrive i quattro score, marca l'item completato e la coda avanza a un item
  genuinamente diverso. Code review con 8 agenti in parallelo: 8 problemi trovati e corretti,
  il più serio dei quali silenzioso — il testo del messaggio cliente modificato dal giudice non
  veniva mai incluso nel payload di scrittura né usato da "Invia mail", quindi la correzione
  spariva senza avviso; risolto allegandolo come `metadata` allo score `verdetto_messaggio` (unico
  posto sensato per conservarlo, dato che non esiste un canale di invio reale). Trovata e corretta
  anche una scrittura non atomica dei quattro score (`Promise.all` senza `id` deterministico:
  un fallimento parziale seguito da un retry duplicava gli score già scritti) — passata a
  `Promise.allSettled` con un `id` deterministico (`{idTraccia}-{nome}`) per rendere il retry
  idempotente. Altri fix: quattro chiamate ridondanti a `/score-configs` per submission ridotte a
  una sola, chiamata duplicata a `trovaIdCoda` eliminata, `<main>` annidato nello stato vuoto,
  messaggio d'errore generico sostituito da quello specifico lanciato dal livello dati,
  `GruppoEsito`/`GruppoAccordo` unificati in un solo componente generico, un fallback silenzioso
  nell'helper di mock dei test che poteva nascondere un mock POST/PATCH mancante. Con questo
  ticket lo strumento è funzionalmente completo secondo la spec (issue #1). Commit `6714f2e`,
  pushato, issue #5 chiusa.
- **2026-09-16, consegna.** Scritti `report/report.md` e `report/CONSEGNA.md`. Formato breve come
  deciso in `CONTEXT.md`: nessuna figura, nessuna sezione da dividere fra home e pubblicazione
  estesa. Prima versione del report in prosa continua (299 parole); Andrea ha chiesto di
  riscriverla con sezioni distinte ("Quale problema risolve", "A chi è indirizzato",
  "Funzionalità", "Personalizzazione") e di togliere le frasi autoconclusive che non aggiungono
  informazione (es. "la fiducia in un processo automatizzato dipende da questo controllo quanto
  dalla qualità del modello che lo alimenta") — tono neutro, non promozionale. Poi due richieste
  ulteriori: nome del prodotto da rivedere (proposte "Controllo Umano" / "Ultima Parola" /
  "Presidio" via AskUserQuestion, scelta **"Ultima Parola"** — resta solo per il testo rivolto al
  pubblico, non rinominata la cartella/repo `giudice` per non rompere link e commit esistenti,
  annotato in `CONSEGNA.md`) e sezione "Quale problema risolve" ridotta a massimo 50 parole (47
  nella versione finale), spostando i dettagli tolti nelle sezioni "A chi è indirizzato" e
  "Funzionalità". Aggiunta poi una sottosezione di funzionalità lato ingegnere AI (tracciabilità
  costi/accuratezza, punteggi umani come base per intervenire sul comportamento di agente e
  giudice automatico) — Andrea l'ha chiesta esplicitamente notando che il report parlava quasi
  solo del lato revisore. Versione finale del report: 317 parole totali, 47 nella sezione
  problema.
- **2026-09-16, modalità demo + tutorial in-app.** Su richiesta di Andrea, per far provare
  l'interfaccia a chi non ha credenziali Langfuse (es. un recruiter): `frontend/lib/demo.ts`
  (tre item fittizzi con esiti diversi — "sì" e "da rivedere" su entrambe le dimensioni — più un
  catalogo fittizio; nessun segreto, sicuro da importare anche lato client) e
  `registraGiudizioDemo`, che cicla sui tre item in memoria senza nessuna scrittura reale.
  `app/page.tsx` entra in modalità demo quando `LANGFUSE_HOST`/`LANGFUSE_PUBLIC_KEY`/
  `LANGFUSE_SECRET_KEY` non sono configurate, invece di sollevare l'errore di configurazione —
  mostra un banner non richiudibile che lo dichiara esplicitamente, per non far credere che sia
  la cosa vera. Aggiunto `TutorialPopup.tsx` (client, dismissibile, nessuna persistenza): un
  popup che spiega — su richiesta esplicita di Andrea, che ha insistito di NON spiegare il
  funzionamento dei pulsanti (dato per scontato) ma "il backend" — che le valutazioni scritte qui
  finiscono su Langfuse, la piattaforma con cui un ingegnere AI traccia costi e accuratezza degli
  agenti e decide dove intervenire. Aggiunta una piccola intestazione col nome del prodotto
  ("Ultima Parola") in `app/layout.tsx`, coerente col rebranding del report. 4 nuovi test
  (cicalo demo con wraparound, rendering della pagina in modalità demo, apertura/chiusura del
  popup) — 22 totali, `tsc`/`next build` puliti. Verificato a schermo in modalità reale
  (popup ed etichetta corretti); la modalità demo verificata solo via test automatico, non a
  schermo, per non dover toccare temporaneamente il file `.env` con le credenziali reali.
- **2026-09-29, rebranding e README, dalla sessione `colloquio-ai-engineer`/progetti.** Andrea ha
  segnalato "Ultima Parola" da rivedere (suonava da slogan, non diceva cosa fa) mentre ripassava
  il progetto per il colloquio. Nuovo nome scelto tra tre opzioni proposte: **"Revisione Umana su
  Langfuse"**. Aggiornati `report/report.md`, `report/CONSEGNA.md` (segnala il cambio anche alla
  sessione del sito, che deve aggiornare `PROGETTI.md`) e `frontend/app/layout.tsx` (titolo pagina
  e intestazione) — nessuna stringa "Ultima Parola" nei test. Aggiunto `README.md` in root:
  mancava del tutto, e il repository è pubblico su GitHub senza descrizione né README — chi
  arrivava da un link vedeva solo cartelle. Non ancora commitato/pushato: in attesa di conferma di
  Andrea prima di toccare il repository pubblico. Discorso di studio per il project deep dive
  scritto in `../colloquio-ai-engineer/progetti/giudice.md`.
- **2026-09-29, prova della demo a schermo.** Prima esecuzione reale della modalità demo in un
  browser: la pagina rispondeva 500 ("Functions cannot be passed directly to Client Components"),
  perché `registraGiudizioDemo` era una funzione normale passata da un Server Component a un
  componente client; i 22 test non lo vedevano perché non eseguono il runtime di Next. Corretto
  esponendola come server action in `lib/azioni.ts` (`"use server"`). Verificato con clic reali:
  popup, compilazione dei quattro giudizi, registrazione e passaggio al secondo item. Corretto
  anche il refuso "fittizzi" (banner e commenti). `next dev` generava in `frontend/` due file
  `AGENTS.md` e `CLAUDE.md` (regole per agenti): rimossi e disattivati con `agentRules: false` in
  `next.config.ts`, perché un `CLAUDE.md` non voluto è lo stesso problema già visto con `claude -p`.
  Aggiunto `docs/schermata.png` (Chrome headless, 1440 px, secondo item della demo) e inserito nel
  README. Nota per la prossima volta: le credenziali reali stanno in `../.env` e vengono caricate
  da `next.config.ts`; per provare la demo bisogna azzerare le tre variabili d'ambiente
  `LANGFUSE_*` (variabili vuote, perché `loadEnvFile` non sovrascrive quelle già impostate).
