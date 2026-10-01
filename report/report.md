# Revisione Umana su Langfuse

**Quale problema risolve:**
Un'automazione che genera contenuto rivolto a un cliente — preventivo, risposta, documento —
deve poter essere bloccata o corretta da qualcuno in azienda prima dell'invio. Chi fa questo
controllo spesso non ha gli strumenti tecnici (tracce, punteggi, configurazioni) con cui un
ingegnere AI osserva lo stesso sistema.

**A chi è indirizzato:**
A chi in azienda fa da ultimo controllo su un processo automatizzato senza averlo costruito e
senza formazione tecnica: un addetto commerciale, amministrativo o di back office, non un tecnico
AI.

**Funzionalità:**

Per chi revisiona:
- Mostra affiancati richiesta originale, preventivo generato, documento pronto per l'invio e
  verdetto di un giudice automatico su due dimensioni separate: contenuto del preventivo, tono
  del messaggio al cliente.
- Il messaggio al cliente è modificabile direttamente nell'interfaccia prima dell'invio.
- Un giudizio su ciascuna delle due dimensioni, con commento obbligatorio quando dissente dal
  verdetto automatico.
- Un clic registra il giudizio e carica l'item successivo della coda.
- "Invia mail" è uno stub: conferma a schermo, nessun invio reale.

Per l'ingegnere AI, tramite il collegamento a Langfuse (la piattaforma di osservabilità che gestisce
coda, tracce e punteggi — non ricostruita da zero):
- Ogni giudizio umano si registra come punteggio tracciabile insieme a quello del giudice
  automatico, sulla stessa traccia che documenta l'intera esecuzione dell'agente.
- Costi e accuratezza di ogni esecuzione restano tracciati sulla piattaforma già usata per la
  manutenzione ordinaria degli agenti, senza un sistema di log separato.
- I punteggi umani raccolti sono la base per intervenire sul comportamento dell'agente o del
  giudice automatico quando i due giudizi divergono.

**Personalizzazione:**
Catalogo prezzi e profilo aziendale del documento (il logo e i dati che compaiono sul preventivo)
sono dati separati dalla logica di revisione: sostituirli con quelli di un'azienda reale non
richiede modifiche all'interfaccia. La stessa interfaccia si applica a qualunque processo di
controllo su output testuali strutturati, non solo preventivi.

**Prova su 10 richieste:**
Un lancio su 10 richieste scritte a mano, con Claude Sonnet come esecutore e come giudice
automatico. Il giudice ha dato «sì» al preventivo in 8 richieste e «da rivedere» in 2, e «sì» al
messaggio in 10. Il revisore ha giudicato 6 richieste, tutte tra quelle approvate dal giudice,
concordando in 5 e dissentendo in una; quei giudizi li ha inseriti l'autore con l'aiuto di Claude
per popolare Langfuse, quindi non misurano l'accordo di un revisore indipendente. Nel primo lancio
il giudice segnalava errori di codifica in 7 messaggi su 10, dovuti a una decodifica sbagliata
dell'output nella pipeline; dopo la correzione sono 0 su 10.

**Demo e codice:**
Demo online: [revisione-umana-langfuse-demo.vercel.app](https://revisione-umana-langfuse-demo.vercel.app) (quattro output reali della pipeline, nessun salvataggio). Esempio di traccia su Langfuse, pubblica: [link](https://cloud.langfuse.com/project/cmu1agdkj00syad0dyas2site/traces/75428e75cb28dd0ff4011fa028ea2e39).
[github.com/Migliaa/revisione-umana-langfuse](https://github.com/Migliaa/revisione-umana-langfuse):
backend Python (SDK Langfuse 4.15.2, 42 test), interfaccia Next.js 16 e React 19 (41 test), MIT.
