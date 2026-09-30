# Interfaccia di revisione (Next.js)

Vedi `../CONTEXT.md` per il glossario di dominio e le decisioni prese. Adattata dal template
`langfuse-examples/custom-annotation-ui` (Next.js/TS).

## Setup

```bash
npm install
```

Le credenziali sono in `../.env` (stesso file usato dal backend Python, non duplicato qui):
`LANGFUSE_HOST`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`. Se mancano, l'interfaccia parte
comunque in **modalità demo**: dati fittizi (`lib/demo.ts`), utili per provare l'interfaccia senza un
progetto Langfuse configurato.

## Sviluppo

```bash
npm run dev
```

Apre la pagina che mostra il prossimo item non ancora giudicato della coda `revisione-preventivi`
(serve che `python run_pipeline.py` sia già stato eseguito nel backend, altrimenti la coda è
vuota).

## Test e typecheck

```bash
npm run test
npm run typecheck
```

I test mockano le risposte dell'API Langfuse (`global.fetch`) — nessuna chiamata reale.
