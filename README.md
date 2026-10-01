# Revisione Umana su Langfuse

Interfaccia web con cui un revisore senza formazione tecnica giudica gli output di un agente (qui preventivi e messaggi ai clienti) prima che escano dall'azienda. I giudizi finiscono come punteggi su Langfuse, accanto a quelli del giudice automatico che ha già valutato gli stessi output, così che un ingegnere AI possa confrontarli.

**Demo online:** https://revisione-umana-langfuse-demo.vercel.app (quattro output reali della pipeline su richieste inventate; i giudizi non vengono salvati) · **Come appare su Langfuse:** [traccia pubblica di esempio](https://cloud.langfuse.com/project/cmu1agdkj00syad0dyas2site/traces/75428e75cb28dd0ff4011fa028ea2e39), con i quattro punteggi del revisore nella scheda «Scores».

![Interfaccia in modalità demo: richiesta, preventivo e verdetti automatici in alto, elenco dei preventivi, area di giudizio e azioni sotto](docs/schermata.png)

## Provare

```bash
cd frontend && npm install && npm run dev      # http://localhost:3000, modalità demo senza Langfuse
```

Collegarla a un progetto Langfuse (serve `claude`, la CLI di Claude Code, con login attivo):

```bash
cp .env.example .env      # inserire LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
cd backend
python -m venv .venv && .venv/Scripts/activate      # .venv/bin/activate su macOS e Linux
pip install -r requirements.txt
python run_pipeline.py 2026-09-29     # elabora le 10 richieste di backend/data/richieste.json
cd ../frontend && npm run dev
```

Test: `cd backend && pytest` (42 test) e `cd frontend && npm test` (41 test) più `npm run typecheck`. Passano da un clone pulito, senza credenziali, perché i client di Claude e di Langfuse sono simulati.

## Che cosa fa

Chi controlla in azienda l'output di un'automazione spesso non l'ha costruita e non conosce tracce e punteggi, mentre chi la mantiene (l'ingegnere AI) ha bisogno proprio dei suoi giudizi per capire dove l'agente sbaglia. L'interfaccia è pensata per un addetto commerciale o amministrativo: un caso per volta, tutto affiancato, con l'elenco dei preventivi in coda per spostarsi fra l'uno e l'altro.

```
richiesta → esecutore → giudice automatico → coda Langfuse → revisore (questa interfaccia) → punteggi su Langfuse
```

Entrano una richiesta cliente in testo libero, un catalogo di voci e prezzi e il profilo dell'azienda (file JSON sostituibili). Escono per ogni richiesta un preventivo con PDF, un messaggio al cliente, due verdetti automatici e, dopo la revisione, quattro punteggi umani. Il revisore dà, per il preventivo e per il messaggio, un esito (sì o no, con commento obbligatorio per il no) e se concorda con il giudice automatico: con i due giudizi separati si distingue se ha sbagliato l'esecutore o il giudice automatico, senza dedurlo da un commento libero. Se modifica il messaggio, il testo corretto è salvato nei metadati del punteggio. «Posticipa» salta il preventivo senza scrivere nulla (resta in coda); la mail si può inviare solo dopo aver registrato il giudizio e non quando il preventivo è «No», e l'invio è simulato.

Esecutore e giudice automatico usano Claude Sonnet tramite `claude -p --model sonnet` (abbonamento, non chiave API); Langfuse Cloud con SDK Python; interfaccia in Next.js 16 e React 19 adattata dal template [`custom-annotation-ui`](https://github.com/langfuse/langfuse-examples/tree/main/applications/custom-annotation-ui).

## Decisioni

- **Layout scelto dopo un prototipo usa e getta** con tre varianti su dati finti (schede per telefono, annotazione riga per riga, tre colonne di sola lettura con area di lavoro sotto). Vince la terza perché il revisore userebbe lo strumento più volte al giorno da postazione fissa, e separare «cosa guardo» da «cosa faccio» regge meglio con quattro campi di giudizio e un testo modificabile.
- **Interfaccia neutra, personalizzazione solo sul contenuto in uscita**: PDF e messaggio portano i dati dell'azienda (qui una finta), colori e pulsanti sono uguali per tutti.
- **Il revisore risponde solo sì o no.** «Da rivedere» è l'incertezza del giudice automatico e il motivo per cui un caso arriva in coda; a chi decide si chiede di decidere, e rinviare è un'azione sul preventivo («Posticipa», che non scrive nulla) e non un terzo esito da registrare.
- **Scrittura dei punteggi idempotente**, perché un retry dopo un fallimento parziale duplicava i punteggi già scritti (trovato in una revisione del codice con 8 agenti in parallelo).
- **Claude Code non interattivo invece di una API a consumo**, a costo di vincolare l'output nel prompt; con `--safe-mode`, perché senza il modello scopriva il `CLAUDE.md` del repository e usciva dal ruolo.

## Limiti

La ricalibrazione del giudice automatico con i giudizi umani non è implementata: raccolgo il dato, non lo applico, perché non esiste un metodo riconosciuto da tutti. Non ci sono login né invio reale delle email, e lo stato «mail inviata» vale solo nella sessione del browser: ricaricando, i preventivi già giudicati escono dalla coda. Il piano gratuito di Langfuse concede 5 letture al minuto, per cui la coda si legge con quattro chiamate in blocco (e il PDF solo quando si apre la scheda Documento), che richiedono 20-30 secondi. Rilanciare `run_pipeline.py` senza indicare un lotto riusa gli id delle tracce e duplica osservazioni e punteggi. Non c'è una misura di accuratezza del giudice automatico.

## Dove sono i file

| Cosa | Dove |
|---|---|
| Esecutore, giudice automatico, prompt | `backend/giudice_pipeline/esecutore.py`, `giudice_automatico.py` |
| Chiamata a Claude Code, scrittura su Langfuse, PDF | `claude_cli.py`, `langfuse_gateway.py`, `documento.py` |
| Lettura della coda e scrittura dei punteggi | `frontend/lib/langfuse.ts`, `frontend/lib/azioni.ts` |
| Schermata di revisione e modalità demo | `frontend/components/ItemDaRivedereView.tsx`, `frontend/lib/demo.ts` |
| Glossario e decisioni | `CONTEXT.md` |

## Dati della prova

Un solo lancio (lotto `2026-09-29`) su 10 richieste scritte a mano, con un caso limite ciascuna in alcune (un servizio non a catalogo, uno da escludere, pareti già in buono stato).

- Il giudice automatico ha dato «sì» al preventivo in 8 richieste e «da rivedere» in 2, al messaggio «sì» in 10 su 10.
- 6 richieste sono state giudicate da un revisore, tutte tra quelle approvate dal giudice: concorda in 5 e dissente in una (cucina con impianto elettrico non a catalogo, messaggio poi corretto). Quei giudizi li ha inseriti l'autore con l'aiuto di Claude per popolare Langfuse, quindi non misurano l'accordo di un revisore indipendente, e 6 casi non bastano per una percentuale.
- Nel primo lancio il giudice segnalava errori di codifica in 7 messaggi su 10. Il difetto era nella pipeline: `subprocess.run(text=True)` su Windows decodificava in cp1252 l'output UTF-8 di Claude. Con `encoding="utf-8"` sono 0 su 10; i test non lo vedevano perché simulano il client.

MIT, vedi [`LICENSE`](LICENSE).
