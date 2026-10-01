# giudice

Interfaccia minima, collegata a Langfuse, che permette a un revisore umano non tecnico di dare
un verdetto su preventivi prodotti da un agente e già valutati da un giudice automatico.

## Language

**Preventivo**:
La tabella di voci, quantità e prezzi che l'esecutore compone per rispondere a una richiesta
cliente. È contenuto strutturato, non il documento finale da inviare.
_Avoid_: Output, risposta dell'agente

**Messaggio cliente**:
Il testo dell'email personalizzata che l'esecutore scrive per accompagnare il preventivo verso
il cliente finto — fa riferimento a quello che il cliente ha chiesto, non è un testo fisso.
_Avoid_: Mail, copy (troppo generico)

**Documento preventivo**:
Il PDF con logo e intestazione aziendale che presenta il preventivo al cliente. Non è deciso
dall'esecutore: è il risultato di un rendering deterministico (template fisso) a partire dal
preventivo, senza intervento di un LLM — non c'è nulla da interpretare una volta che la tabella
esiste, solo da impaginare.
_Avoid_: PDF (va bene nei documenti tecnici, non come nome del ruolo nel dominio)

**Esecutore**:
L'agente che, data una richiesta, produce il preventivo e il messaggio cliente. È uno dei due
soggetti che il giudizio umano valuta implicitamente. Non genera il documento preventivo (PDF):
quello è un passo deterministico a valle.
_Avoid_: Agente (troppo generico — nel progetto ci sono più agenti con ruoli distinti)

**Giudice automatico**:
L'agente LLM-as-judge che assegna **due verdetti distinti** — uno sul preventivo, uno sul
messaggio cliente — ai contenuti prodotti dall'esecutore, prima che arrivino al giudice umano.
Verdetti separati (non uno unico) per poter capire in quale dei due l'esecutore ha sbagliato e
filtrare di conseguenza su Langfuse. Non valuta il documento preventivo (PDF): un rendering
deterministico non ha nulla da giudicare. È il secondo soggetto che il giudizio umano valuta
implicitamente, dimensione per dimensione.
_Avoid_: LLM-as-judge (termine tecnico Langfuse, va bene nei documenti tecnici ma non come nome
del ruolo nel dominio), giudice (ambiguo con giudice umano)

**Giudice umano**:
La persona non tecnica che rivede richiesta, preventivo, documento preventivo, messaggio cliente
e i due verdetti del giudice automatico tramite l'interfaccia "giudice". Dà **due verdetti
distinti** (uno sul preventivo, uno sul messaggio cliente, ciascuno sì/no + commento
obbligatorio se no) e due giudizi di accordo separati col giudice automatico (uno per dimensione) — non un
verdetto unico sull'insieme. Il suo giudizio è il termine di paragone sia per l'esecutore sia per
il giudice automatico, dimensione per dimensione. Non è solo un revisore: è anche l'addetto che
userebbe questa stessa schermata per il proprio lavoro reale (rivedere ed eventualmente correggere
il messaggio cliente prima dell'invio).
_Avoid_: Revisore, annotatore (termine tecnico Langfuse)

**Profilo azienda**:
Nome, logo e dati di contatto finti usati solo dal rendering del documento preventivo. Statico,
scritto una volta, non prodotto né letto dall'esecutore o dal giudice automatico.
_Avoid_: Branding (termine generico, non specifico al progetto)

**Catalogo di riferimento**:
La stessa vista del catalogo, resa consultabile dall'interfaccia al giudice umano durante la
revisione — non un dato nuovo, solo il catalogo già esistente esposto in lettura nell'interfaccia,
perché chi revisiona non deve ricordare i prezzi a memoria per giudicare un preventivo.
_Avoid_: Listino prezzi (ridondante col termine Catalogo già scelto)

**Catalogo**:
L'elenco di servizi/voci di prezzo da cui l'esecutore compone un preventivo. Nel prototipo è
scritto a mano una volta; in un prodotto reale sarebbe fornito dall'azienda cliente.
_Avoid_: Listino (sinonimo valido ma meno usato nel progetto)

**Richiesta cliente**:
L'input di partenza da cui l'esecutore genera il preventivo — descrive cosa il cliente finto
vuole. Nel prototipo è scritta a mano una volta, non generata a runtime.
_Avoid_: Query, prompt (troppo tecnici per un termine di dominio)

**Ricalibrazione**:
Meccanismo che usa i verdetti del giudice umano per correggere il comportamento del giudice
automatico. Nel prototipo serve a dimostrare che il collegamento funziona, non a validarne
l'efficacia con ripetizioni o misure statistiche.
_Avoid_: Fine-tuning, allineamento (termine Langfuse per il caso d'uso, tenuto come sinonimo
tecnico ma non come nome primario)

## Decisioni prese

- Base tecnica: si parte dal template `langfuse-examples/custom-annotation-ui` (Next.js/TS),
  adattato — non da un'interfaccia scritta da zero. Verificato: è l'unico template Langfuse
  pensato per revisione umana custom, nessuna alternativa reale trovata.
- Caso d'uso: controllo preventivi.
- Struttura a doppio giudice: esecutore → giudice automatico → giudice umano.
- L'esecutore genera il preventivo da zero a partire da una richiesta cliente finta (non
  corregge un preventivo preesistente).
- L'esecutore produce due output testuali per ogni richiesta: il preventivo (tabella) e il
  messaggio cliente (email personalizzata). Entrambi vengono valutati dal giudice automatico e
  mostrati al giudice umano. Il documento preventivo (PDF) è invece un rendering deterministico
  a valle, senza LLM — un template fisso con un profilo azienda finto, non un output
  dell'esecutore e non qualcosa che il giudice automatico valuta.
- Il giudice umano vede, affiancati nella stessa schermata: richiesta originale, preventivo
  (tabella o anteprima del documento preventivo), messaggio cliente, verdetto del giudice
  automatico — perché deve approvare l'insieme che uscirebbe davvero verso il cliente, non solo
  i numeri.
- Il giudizio umano è espresso con due score config distinti: uno sul preventivo (sì/no/da
  rivedere + commento), uno sull'accordo col giudice automatico (sì/no) — quest'ultimo è ciò che
  rende possibile giudicare il giudice automatico senza doverlo dedurre da un commento libero.
- Scala: poche ripetizioni, bastano a dimostrare che il collegamento funziona — nessuna
  validazione statistica del giudice automatico o dell'effetto della ricalibrazione.
- Langfuse Cloud, piano gratuito (Hobby) — nessun self-hosting necessario per il prototipo.
- Nessun login per il giudice umano in questo prototipo — rimandato a un eventuale prodotto reale.
- Deploy vero (strada 3 del brief) rimandato: si progetta e imposta il sistema in modo che sia
  predisponibile alla produzione in un secondo momento, ma non si fa il deploy adesso.
- Backend che fa girare esecutore + giudice automatico + inserimento in coda Langfuse: Python
  (SDK Langfuse Python), separato dall'interfaccia web che resta Next.js/TS adattata dal
  template. Due linguaggi nel progetto, uno per componente.
- Catalogo e richieste cliente: scritti a mano una volta da noi (nessun dataset pronto esiste),
  coerente con "poche ripetizioni, basta dimostrare che il collegamento funziona".
- Predisposizione alla produzione, in concreto: catalogo e richieste cliente non vanno
  hardcoded nella logica della pipeline, ma caricati da una fonte dati separata e sostituibile
  (schema documentato) — così un'azienda reale può in futuro collegare il proprio catalogo e il
  proprio storico preventivi senza riscrivere la pipeline.
- Formato di consegna: breve — report sintetico + `CONSEGNA.md`, non il formato lungo
  prosa+figure di tassonomia/metodo, perché il centro del progetto è uno strumento da usare, non
  un'analisi da leggere.
- Il metodo di inserimento dati per la predisposizione alla produzione resta a livello di schema
  documentato e disaccoppiato dalla pipeline (es. file con una struttura definita + comando da
  eseguire) — non si costruisce una schermata di caricamento nell'interfaccia web ora, coerente
  con l'assenza di login e di deploy in questo prototipo.
- Esecutore e giudice automatico girano entrambi tramite l'abbonamento Claude (Claude Code in
  modalità non interattiva, `claude -p`, come sottoprocesso dalla pipeline Python), non tramite
  una chiave API a consumo — coerente con l'obiettivo di automatizzare i costi già posto nel
  caso d'uso a doppio giudice. Compromesso accettato: output testuale da vincolare bene nel
  prompt invece di un JSON strutturato garantito da una API a chiamata diretta.
- L'esperienza del giudice umano (layout, numero di click, feedback) passa da un prototipo
  throwaway prima di scrivere in dettaglio i ticket dell'interfaccia — non affrontata solo con
  criteri di accettazione scritti sulla carta.
- **Variante di layout scelta: "tre colonne + area di lavoro"** — riga superiore con tre colonne
  di sola lettura (richiesta, preventivo a schede tabella/documento, i due verdetti automatici);
  sotto, un'area di lavoro divisa in due blocchi (giudizio sul preventivo; messaggio cliente
  editabile + giudizio sul messaggio); in alto un elenco dei preventivi in coda con il loro stato; in fondo una barra con
  "Posticipa", "Registra giudizio" e "Invia mail" (disabilitato prima della registrazione e con "No"
  sul preventivo). Preferita alle altre due varianti provate (stack mobile a card; annotazione
  inline riga per riga) perché il giudice umano qui usa lo strumento come lavoro vero più volte al
  giorno da postazione fissa, non come controllo rapido da telefono: separare chiaramente "cosa
  guardo" (le tre colonne) da "cosa faccio" (l'area di lavoro sotto) regge meglio quando i campi
  di giudizio sono quattro più un testo editabile, rispetto a comprimere tutto in una sequenza
  verticale o in annotazioni sparse riga per riga. Il prototipo throwaway (tre varianti, dati
  finti) è archiviato sul branch `prototype/giudice-ui`, non su `main` — la variante vinta è
  questa nota, non il codice del prototipo stesso.
- **Stile visivo: white-label esplicito.** Il "chrome" dell'app giudice (bottoni, sfondo, colori
  di stato sì/no/da rivedere) ha un'identità propria, neutra, non legata a nessuna azienda
  cliente. Il documento preventivo — e per estensione il messaggio cliente, essendo entrambi
  contenuto che uscirebbe verso IL cliente dell'azienda che usa lo strumento — porta invece il
  profilo azienda (nome, logo, colore) come zona visivamente distinta e chiaramente sostituibile,
  per comunicare a colpo d'occhio che quella parte si personalizza per l'azienda a cui il
  prodotto viene offerto, mentre lo strumento di revisione resta lo stesso per tutti. Azienda
  finta usata per il profilo: **ACME**.
- Doppio verdetto (preventivo + messaggio cliente), sia per il giudice automatico sia per il
  giudice umano, incluso l'accordo — non un verdetto unico sull'insieme. Motivazione di Andrea:
  permette di capire dove ha sbagliato l'esecutore e filtrare di conseguenza su Langfuse.
- Il giudice umano può modificare il testo del messaggio cliente direttamente nell'interfaccia
  prima di un eventuale invio — non è un campo di sola lettura.
- L'interfaccia ha un pulsante operativo "Invia mail", perché il giudice umano nel caso reale è
  anche l'addetto che invia i preventivi, non solo chi li valuta per l'AI engineer. Resta uno
  stub anche nel prodotto finale di questo progetto (non collegato a un servizio email reale) —
  stessa logica di login e deploy: rimandato a un eventuale prodotto vero.
- Catalogo di riferimento consultabile dall'interfaccia durante la revisione (lo stesso catalogo
  già usato dalla pipeline, esposto in lettura). Nessun motore di sconti/pacchetti: non esistono
  regole di scontistica definite da nessuna parte nel progetto, costruirle ora aprirebbe un
  progetto a sé.
- **`claude -p` va invocato con `--safe-mode`** (non `--bare`): senza, il modello scopre il
  `CLAUDE.md` di questo stesso repo e a volte si accorge di essere "Claude Code sul progetto
  giudice", rifiutando di interpretare il ruolo di esecutore/giudice automatico. `--safe-mode`
  disattiva CLAUDE.md/skill/plugin mantenendo l'autenticazione via abbonamento; `--bare` fa lo
  stesso ma forza la chiave API, incompatibile con la decisione di usare l'abbonamento.
- **Nota/limite noto**: rilanciare `run_pipeline.py` sulle stesse richieste non è idempotente a
  livello di traccia — `create_trace_id` è derivato dall'id della richiesta (stesso id →
  stessa traccia), ma i punteggi e l'accodamento in coda si sommano invece di sostituirsi. Non
  richiesto dal ticket #2 (che copre solo l'idempotenza di score config e coda), ma da tenere a
  mente eseguendo demo ripetute — svuotare la coda su Langfuse tra un'esecuzione e l'altra se il
  duplicato dà fastidio.
- Ricalibrazione: **fuori scope**, verificato. Andrea non vuole dimostrare che il giudizio umano
  modifichi il comportamento del giudice automatico entro questo progetto — è un processo
  separato, lato backend dell'AI engineer — a meno che non fosse un metodo standard e
  riconosciuto in modo pressoché unanime dalla comunità. Verificato che non lo è: industria
  (Langfuse, Braintrust) prescrive editing manuale del prompt guidato dai disaccordi, letteratura
  accademica prescrive fine-tuning/preference optimization di un modello giudice dedicato, un
  filone più recente propone calibrazione statistica dei punteggi — nessuno riconosciuto come
  standard rispetto agli altri. Le fonti convergono solo sulla fase di misurazione (dataset con
  etichette umane, calcolo dell'accordo), non sulla correzione. Il prototipo si ferma quindi a
  raccogliere i punteggi umani (`source: ANNOTATION`) leggibili via API — la loro lettura per
  correggere il giudice resta un passo manuale futuro, non costruito qui.
- **Ticket #3 (documento preventivo, PDF) implementato.** Rendering con `reportlab` in
  `backend/giudice_pipeline/documento.py`, nessuna dipendenza da un client LLM (verificato via
  AST nei test). Profilo azienda finto (ACME) in `backend/data/profilo_azienda.json`, caricato
  con lo stesso pattern di validazione di catalogo e richieste. Il PDF è referenziato sulla
  traccia Langfuse come media (`LangfuseMedia`, `application/pdf`) in un'osservazione
  `documento-preventivo` — verificato con una chiamata reale che il riferimento è recuperabile
  dalla traccia via API. `esegui_pipeline` prende un solo parametro opzionale `genera_documento`
  (già bindato al profilo azienda da `run_pipeline.py` tramite `functools.partial`), non due
  parametri separati: evita uno stato illegale rappresentabile (documento richiesto ma profilo
  assente). Validazione dei tipi numerici del preventivo spostata in `esecutore.py`
  (`_valida_preventivo`), non nel modulo di rendering: fail-fast dove il dato viene prodotto.
  Dettagli del processo (bug trovati in review, decisioni di refactor) in `DIARIO.md`, non
  ripetuti qui.
- **Ticket #4 (interfaccia, lettura dell'item di coda) implementato.** Primo codice TypeScript
  del repo: `frontend/` (Next.js App Router), adattato dal layout vinto nel prototipo throwaway
  (variante "tre colonne + area di lavoro"). Legge la coda Langfuse via chiamate `fetch` dirette
  alle API REST pubbliche (stesso backend REST usato dall'SDK Python, nessun SDK Node aggiunto),
  interamente lato server: le chiavi Langfuse non arrivano mai al browser. Il catalogo di
  riferimento è letto direttamente da `backend/data/catalogo.json`, non duplicato. L'area di
  lavoro (giudizio, invio) è presente nel layout ma disabilitata: la sua interattività è ticket
  #5. Dettagli del processo (scelte di libreria, verifica end-to-end contro Langfuse Cloud) in
  `DIARIO.md`, non ripetuti qui.
