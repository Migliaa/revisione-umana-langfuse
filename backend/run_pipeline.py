#!/usr/bin/env python
"""Comando singolo: genera preventivo+messaggio per ogni richiesta, li fa valutare dal giudice
automatico, e accoda tutto su Langfuse pronto per la revisione umana.

Uso:
    python run_pipeline.py [lotto]

Le tracce hanno un id deterministico derivato dall'id della richiesta: rilanciare senza `lotto`
aggiungerebbe osservazioni e punteggi alle stesse tracce. Con `lotto` (es. `2026-09-29`) l'id
diventa `<lotto>-<id richiesta>` e ogni lancio produce tracce nuove.

Richiede LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY come variabili d'ambiente
(vedi .env.example alla radice del repo) e un login valido di `claude` (abbonamento, non chiave
API — vedi CONTEXT.md per la motivazione)."""
import functools
import os
import sys

from dotenv import load_dotenv
from langfuse import Langfuse

from giudice_pipeline.dati import carica_catalogo, carica_profilo_azienda, carica_richieste
from giudice_pipeline.documento import genera_documento_preventivo
from giudice_pipeline.esecutore import genera_preventivo_e_messaggio
from giudice_pipeline.giudice_automatico import valuta
from giudice_pipeline.langfuse_gateway import LangfuseGateway
from giudice_pipeline.pipeline import esegui_pipeline


def main() -> int:
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

    mancanti = [v for v in ("LANGFUSE_HOST", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY") if not os.getenv(v)]
    if mancanti:
        print(f"Variabili d'ambiente mancanti: {', '.join(mancanti)} — vedi .env.example", file=sys.stderr)
        return 1

    client = Langfuse(
        host=os.environ["LANGFUSE_HOST"],
        public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
        secret_key=os.environ["LANGFUSE_SECRET_KEY"],
    )
    gateway = LangfuseGateway(client)

    catalogo = carica_catalogo()
    richieste = carica_richieste()
    if len(sys.argv) > 1:
        lotto = sys.argv[1]
        richieste = [{**r, "id": f"{lotto}-{r['id']}"} for r in richieste]
    genera_documento = functools.partial(genera_documento_preventivo, profilo_azienda=carica_profilo_azienda())

    print(f"Elaboro {len(richieste)} richieste...")
    trace_ids = esegui_pipeline(
        catalogo, richieste, genera_preventivo_e_messaggio, valuta, gateway, genera_documento=genera_documento
    )
    client.flush()

    for richiesta, trace_id in zip(richieste, trace_ids):
        print(f"  {richiesta['id']} -> traccia {trace_id}")
    print("Fatto. Apri la coda 'revisione-preventivi' su Langfuse per rivedere.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
