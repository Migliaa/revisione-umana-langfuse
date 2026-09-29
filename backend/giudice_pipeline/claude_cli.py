"""Wrapper per invocare Claude Code in modalità non interattiva (abbonamento, non chiave API)."""
import json
import subprocess


class ErroreClaudeCli(Exception):
    pass


def genera_testo(prompt: str, model: str = "sonnet", timeout: int = 180) -> str:
    try:
        risultato = subprocess.run(
            # --safe-mode: disattiva CLAUDE.md/skill/plugin del progetto "giudice" — senza,
            # il modello a volte si accorge di essere Claude Code sul repo e rifiuta di
            # interpretare il ruolo (esecutore/giudice automatico), rispondendo di sé invece
            # che con l'output richiesto. A differenza di --bare, lascia intatta
            # l'autenticazione via abbonamento (--bare forza la chiave API).
            ["claude", "--safe-mode", "-p", prompt, "--output-format", "json", "--model", model],
            capture_output=True,
            # UTF-8 esplicito: su Windows il default è cp1252 e "€" diventa "â‚¬", "à" diventa "Ã ".
            encoding="utf-8",
            timeout=timeout,
        )
    except FileNotFoundError as errore:
        raise ErroreClaudeCli("comando 'claude' non trovato — è installato ed è nel PATH?") from errore

    try:
        dati = json.loads(risultato.stdout)
    except json.JSONDecodeError as errore:
        messaggio = risultato.stderr.strip() or risultato.stdout.strip() or "nessun output"
        raise ErroreClaudeCli(f"output non JSON da Claude CLI (returncode {risultato.returncode}): {messaggio}") from errore

    if dati.get("is_error"):
        raise ErroreClaudeCli(dati.get("result", "errore sconosciuto da Claude CLI"))
    return dati["result"]
