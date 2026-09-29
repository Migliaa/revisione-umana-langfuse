# Pipeline (esecutore + giudice automatico + accodamento)

Vedi `../CONTEXT.md` per il glossario di dominio e le decisioni prese.

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate su macOS/Linux
pip install -r requirements.txt
```

Copia `../.env.example` in `../.env` e inserisci le chiavi del tuo progetto Langfuse. Assicurati
che `claude` (Claude Code CLI) sia loggato con l'abbonamento — la pipeline lo invoca in modalità
non interattiva, non usa una chiave API a consumo:

```bash
claude /login
```

## Eseguire la pipeline

```bash
python run_pipeline.py            # tracce con id derivato dalla richiesta
python run_pipeline.py 2026-09-29 # un lotto nuovo: tracce distinte a ogni lancio
```

Elabora tutte le richieste in `data/richieste.json` usando il catalogo in `data/catalogo.json`
(schema in `data/README.md`), e accoda il risultato sulla annotation queue `revisione-preventivi`
del progetto Langfuse configurato.

## Test

```bash
pytest
mypy giudice_pipeline run_pipeline.py --ignore-missing-imports
```

I test mockano il client LLM (`claude_cli`) e il client Langfuse — non fanno chiamate reali.
