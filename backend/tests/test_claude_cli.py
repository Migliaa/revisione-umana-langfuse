import json
import subprocess
from unittest.mock import patch

import pytest

from giudice_pipeline.claude_cli import ErroreClaudeCli, genera_testo


def _completed(stdout_dict, returncode=0):
    return subprocess.CompletedProcess(
        args=["claude"], returncode=returncode, stdout=json.dumps(stdout_dict), stderr=""
    )


@patch("giudice_pipeline.claude_cli.subprocess.run")
def test_genera_testo_restituisce_il_campo_result(mock_run):
    mock_run.return_value = _completed({"is_error": False, "result": "ciao"})
    assert genera_testo("un prompt") == "ciao"


@patch("giudice_pipeline.claude_cli.subprocess.run")
def test_genera_testo_usa_il_modello_richiesto(mock_run):
    mock_run.return_value = _completed({"is_error": False, "result": "ok"})
    genera_testo("un prompt", model="sonnet")
    args = mock_run.call_args[0][0]
    assert "--model" in args and args[args.index("--model") + 1] == "sonnet"
    assert "-p" in args and "un prompt" in args
    assert "--safe-mode" in args, "senza --safe-mode il modello scopre il CLAUDE.md del progetto ed esce dal ruolo"


@patch("giudice_pipeline.claude_cli.subprocess.run")
def test_genera_testo_decodifica_l_output_come_utf8(mock_run):
    mock_run.return_value = _completed({"is_error": False, "result": "1.200 € più"})
    genera_testo("un prompt")
    assert mock_run.call_args.kwargs.get("encoding") == "utf-8", "senza, su Windows il testo arriva in cp1252"


@patch("giudice_pipeline.claude_cli.subprocess.run")
def test_genera_testo_solleva_errore_se_is_error(mock_run):
    mock_run.return_value = _completed({"is_error": True, "result": "OAuth session expired"})
    with pytest.raises(ErroreClaudeCli, match="OAuth session expired"):
        genera_testo("un prompt")


@patch("giudice_pipeline.claude_cli.subprocess.run")
def test_genera_testo_solleva_errore_claude_cli_se_stdout_non_e_json(mock_run):
    mock_run.return_value = subprocess.CompletedProcess(
        args=["claude"], returncode=1, stdout="", stderr="errore di rete"
    )
    with pytest.raises(ErroreClaudeCli, match="errore di rete"):
        genera_testo("un prompt")


@patch("giudice_pipeline.claude_cli.subprocess.run")
def test_genera_testo_solleva_errore_claude_cli_se_binario_assente(mock_run):
    mock_run.side_effect = FileNotFoundError("claude non trovato")
    with pytest.raises(ErroreClaudeCli, match="PATH"):
        genera_testo("un prompt")
