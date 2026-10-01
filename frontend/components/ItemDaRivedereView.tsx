"use client";

import { useState } from "react";

import type {
  EsitoUmano,
  GiudizioUmano,
  ItemDaRivedere,
  Verdetto as VerdettoTipo,
  VoceCatalogo,
} from "@/lib/tipi";

const RESA_ESITO: Record<VerdettoTipo["esito"], { etichetta: string; classe: string }> = {
  si: { etichetta: "Coerente", classe: "pill-ok" },
  da_rivedere: { etichetta: "Da rivedere", classe: "pill-warn" },
  no: { etichetta: "Incoerente", classe: "pill-bad" },
};

const OPZIONI_ESITO: { valore: EsitoUmano; etichetta: string }[] = [
  { valore: "si", etichetta: "Sì" },
  { valore: "no", etichetta: "No" },
];

const OPZIONI_ACCORDO: { valore: boolean; etichetta: string }[] = [
  { valore: true, etichetta: "Sì" },
  { valore: false, etichetta: "No" },
];

function commentoObbligatorioSoddisfatto(esito: EsitoUmano | null, commento: string): boolean {
  return esito === "si" || commento.trim() !== "";
}

function BloccoVerdetto({ titolo, verdetto }: { titolo: string; verdetto: VerdettoTipo }) {
  const { etichetta, classe } = RESA_ESITO[verdetto.esito];
  return (
    <div className="blocco-verdetto">
      <p className="etichetta">{titolo}</p>
      <span className={`pill ${classe}`}>{etichetta}</span>
      <p className="testo-motivazione">{verdetto.testo}</p>
    </div>
  );
}

function TabellaCatalogo({ catalogo }: { catalogo: VoceCatalogo[] }) {
  return (
    <table className="tabella-catalogo">
      <tbody>
        {catalogo.map((voce) => (
          <tr key={voce.voce}>
            <td>{voce.voce}</td>
            <td>
              {voce.prezzo_unitario.toFixed(2)} € / {voce.unita}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GruppoScelte<T>({
  etichetta,
  opzioni,
  valore,
  onCambia,
  bloccato,
}: {
  etichetta: string;
  opzioni: { valore: T; etichetta: string }[];
  valore: T | null;
  onCambia: (valore: T) => void;
  bloccato: boolean;
}) {
  return (
    <>
      <p className="etichetta">{etichetta}</p>
      <div className="gruppo-scelte" role="group" aria-label={etichetta}>
        {opzioni.map((opzione, i) => (
          <button
            key={i}
            type="button"
            disabled={bloccato}
            aria-pressed={valore === opzione.valore}
            className={valore === opzione.valore ? "selezionata" : ""}
            onClick={() => onCambia(opzione.valore)}
          >
            {opzione.etichetta}
          </button>
        ))}
      </div>
    </>
  );
}

type Bozza = {
  messaggioCliente: string;
  esitoPreventivo: EsitoUmano | null;
  commentoPreventivo: string;
  accordoPreventivo: boolean | null;
  esitoMessaggio: EsitoUmano | null;
  commentoMessaggio: string;
  accordoMessaggio: boolean | null;
};

type Stato = "da_giudicare" | "giudicato" | "inviato";

function bozzaIniziale(item: ItemDaRivedere): Bozza {
  return {
    messaggioCliente: item.messaggioCliente,
    esitoPreventivo: null,
    commentoPreventivo: "",
    accordoPreventivo: null,
    esitoMessaggio: null,
    commentoMessaggio: "",
    accordoMessaggio: null,
  };
}

/** Con "No" sul preventivo non c'è nulla da spedire: l'item si chiude senza mail. */
function mailInviabile(bozza: Bozza): boolean {
  return bozza.esitoPreventivo !== "no";
}

function etichettaStato(stato: Stato, bozza: Bozza): string {
  if (stato === "da_giudicare") return "Da giudicare";
  if (stato === "inviato") return "Mail inviata";
  return mailInviabile(bozza) ? "Giudicato · mail da inviare" : "Giudicato · nessuna mail";
}

function concluso(stato: Stato, bozza: Bozza): boolean {
  return stato === "inviato" || (stato === "giudicato" && !mailInviabile(bozza));
}

export function ItemDaRivedereView({
  items,
  catalogo,
  registraGiudizio,
  risolviUrlDocumento,
}: {
  items: ItemDaRivedere[];
  catalogo: VoceCatalogo[];
  registraGiudizio: (giudizio: GiudizioUmano) => Promise<void>;
  risolviUrlDocumento?: (idMedia: string) => Promise<string>;
}) {
  const [ordine, setOrdine] = useState<string[]>(() => items.map((i) => i.idTraccia));
  const [idAttuale, setIdAttuale] = useState<string | null>(items[0]?.idTraccia ?? null);
  const [bozze, setBozze] = useState<Record<string, Bozza>>(() =>
    Object.fromEntries(items.map((i) => [i.idTraccia, bozzaIniziale(i)]))
  );
  const [stati, setStati] = useState<Record<string, Stato>>(() =>
    Object.fromEntries(items.map((i) => [i.idTraccia, "da_giudicare" as Stato]))
  );
  const [scheda, setScheda] = useState<"tabella" | "documento">("tabella");
  const [catalogoVisibile, setCatalogoVisibile] = useState(false);
  const [registrazioneInCorso, setRegistrazioneInCorso] = useState(false);
  const [erroreRegistrazione, setErroreRegistrazione] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [urlDocumenti, setUrlDocumenti] = useState<Record<string, string>>({});

  const itemAttuale = items.find((i) => i.idTraccia === idAttuale);
  if (!itemAttuale || !idAttuale) {
    return (
      <div className="stato-vuoto">
        <p>Nessun preventivo da rivedere al momento.</p>
      </div>
    );
  }

  const bozza = bozze[idAttuale];
  const stato = stati[idAttuale];
  const bloccato = stato !== "da_giudicare";

  function aggiorna(modifiche: Partial<Bozza>) {
    setBozze((precedenti) => ({ ...precedenti, [idAttuale!]: { ...precedenti[idAttuale!], ...modifiche } }));
  }

  const giudizioCompleto =
    bozza.esitoPreventivo !== null &&
    commentoObbligatorioSoddisfatto(bozza.esitoPreventivo, bozza.commentoPreventivo) &&
    bozza.accordoPreventivo !== null &&
    bozza.esitoMessaggio !== null &&
    commentoObbligatorioSoddisfatto(bozza.esitoMessaggio, bozza.commentoMessaggio) &&
    bozza.accordoMessaggio !== null;

  const totale = itemAttuale.preventivo.reduce((somma, riga) => somma + riga.totale, 0);

  async function apriDocumento() {
    setScheda("documento");
    const { idMediaDocumento } = itemAttuale!;
    if (!idMediaDocumento || !risolviUrlDocumento || urlDocumenti[idAttuale!]) return;
    const id = idAttuale!;
    try {
      const url = await risolviUrlDocumento(idMediaDocumento);
      setUrlDocumenti((precedenti) => ({ ...precedenti, [id]: url }));
    } catch {
      // l'anteprima resta "non disponibile"; il revisore può riprovare riaprendo la scheda
    }
  }

  function vaiA(id: string) {
    setIdAttuale(id);
    setScheda("tabella");
    setCatalogoVisibile(false);
    setErroreRegistrazione(null);
    setAvviso(null);
  }

  /** Il primo item, nell'ordine dato, ancora da chiudere e diverso da `escludi`. */
  function prossimoDaGestire(ordineDato: string[], statiDati: Record<string, Stato>, escludi: string): string | null {
    return ordineDato.find((id) => id !== escludi && !concluso(statiDati[id], bozze[id])) ?? null;
  }

  const altroDaGestire = prossimoDaGestire(ordine, stati, idAttuale);
  const tuttoConcluso = ordine.every((id) => concluso(stati[id], bozze[id]));

  /** Non scrive nulla su Langfuse: l'item resta in coda e va in fondo all'elenco della sessione. */
  function posticipa() {
    const nuovoOrdine = [...ordine.filter((id) => id !== idAttuale), idAttuale!];
    setOrdine(nuovoOrdine);
    const prossimo = prossimoDaGestire(nuovoOrdine, stati, idAttuale!);
    if (prossimo) vaiA(prossimo);
  }

  async function registra() {
    if (!giudizioCompleto || !itemAttuale) return;
    setRegistrazioneInCorso(true);
    setErroreRegistrazione(null);
    try {
      await registraGiudizio({
        idTraccia: itemAttuale.idTraccia,
        idItemCoda: itemAttuale.idItemCoda,
        esitoPreventivo: bozza.esitoPreventivo as EsitoUmano,
        commentoPreventivo: bozza.commentoPreventivo,
        accordoPreventivo: bozza.accordoPreventivo as boolean,
        esitoMessaggio: bozza.esitoMessaggio as EsitoUmano,
        commentoMessaggio: bozza.commentoMessaggio,
        accordoMessaggio: bozza.accordoMessaggio as boolean,
        messaggioClienteCorretto: bozza.messaggioCliente,
      });
      const nuoviStati = { ...stati, [idAttuale!]: "giudicato" as Stato };
      setStati(nuoviStati);
      if (mailInviabile(bozza)) {
        setAvviso("Giudizio registrato: ora si può inviare la mail.");
      } else {
        const prossimo = prossimoDaGestire(ordine, nuoviStati, idAttuale!);
        if (prossimo) vaiA(prossimo);
        setAvviso("Giudizio registrato. Con il preventivo «No» la mail non si invia.");
      }
    } catch (errore) {
      setErroreRegistrazione(errore instanceof Error ? errore.message : "Registrazione non riuscita: riprovare.");
    } finally {
      setRegistrazioneInCorso(false);
    }
  }

  function inviaMail() {
    const nuoviStati = { ...stati, [idAttuale!]: "inviato" as Stato };
    setStati(nuoviStati);
    const prossimo = prossimoDaGestire(ordine, nuoviStati, idAttuale!);
    if (prossimo) vaiA(prossimo);
    setAvviso("Mail inviata (simulata).");
  }

  return (
    <div className="pagina">
      <nav className="elenco-item" aria-label="Preventivi del lotto">
        {ordine.map((id, posizione) => {
          const item = items.find((i) => i.idTraccia === id)!;
          return (
            <button
              key={id}
              type="button"
              aria-current={id === idAttuale ? "true" : undefined}
              className={id === idAttuale ? "voce-elenco attiva" : "voce-elenco"}
              onClick={() => vaiA(id)}
            >
              <span className="voce-titolo">
                {posizione + 1}. {item.richiestaCliente}
              </span>
              <span className="voce-stato">{etichettaStato(stati[id], bozze[id])}</span>
            </button>
          );
        })}
      </nav>
      {tuttoConcluso && <p className="testo-conferma-lotto">Tutti i preventivi sono stati gestiti.</p>}

      <div className="colonne">
        <section className="pannello" aria-label="Richiesta cliente">
          <h2>Richiesta cliente</h2>
          <p>{itemAttuale.richiestaCliente}</p>
        </section>

        <section className="pannello" aria-label="Preventivo">
          <div className="schede" role="tablist">
            <button
              role="tab"
              type="button"
              aria-selected={scheda === "tabella"}
              className={scheda === "tabella" ? "scheda-btn attiva" : "scheda-btn"}
              onClick={() => setScheda("tabella")}
            >
              Tabella
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={scheda === "documento"}
              className={scheda === "documento" ? "scheda-btn attiva" : "scheda-btn"}
              onClick={apriDocumento}
            >
              Documento
            </button>
          </div>

          {scheda === "tabella" ? (
            <div>
              <table className="tabella-preventivo">
                <tbody>
                  {itemAttuale.preventivo.map((riga, i) => (
                    <tr key={i}>
                      <td>
                        {riga.voce} · {riga.quantita}
                      </td>
                      <td>{riga.totale.toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr className="riga-totale">
                    <td>Totale</td>
                    <td>{totale.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" className="ghost-btn" onClick={() => setCatalogoVisibile((v) => !v)}>
                {catalogoVisibile ? "Nascondi catalogo di riferimento" : "Vedi catalogo di riferimento"}
              </button>
              {catalogoVisibile && <TabellaCatalogo catalogo={catalogo} />}
            </div>
          ) : (
            <div className="anteprima-documento">
              {(itemAttuale.documentoUrl ?? urlDocumenti[idAttuale]) ? (
                <iframe
                  src={(itemAttuale.documentoUrl ?? urlDocumenti[idAttuale])!}
                  title="Anteprima documento preventivo"
                />
              ) : (
                <p className="muto">Anteprima del documento non disponibile.</p>
              )}
            </div>
          )}
        </section>

        <section className="pannello" aria-label="Verdetto automatico">
          <h2>Verdetto automatico</h2>
          <BloccoVerdetto titolo="Preventivo" verdetto={itemAttuale.verdettoPreventivo} />
          <BloccoVerdetto titolo="Messaggio cliente" verdetto={itemAttuale.verdettoMessaggio} />
        </section>
      </div>

      <div className="area-lavoro">
        <section className="pannello">
          <h3>Il preventivo va bene?</h3>
          <GruppoScelte
            etichetta="Giudizio preventivo"
            opzioni={OPZIONI_ESITO}
            valore={bozza.esitoPreventivo}
            onCambia={(v) => aggiorna({ esitoPreventivo: v })}
            bloccato={bloccato}
          />
          <textarea
            placeholder="Commento (obbligatorio se la risposta è 'No')"
            value={bozza.commentoPreventivo}
            disabled={bloccato}
            onChange={(e) => aggiorna({ commentoPreventivo: e.target.value })}
          />
          <GruppoScelte
            etichetta="D'accordo col giudice automatico sul preventivo?"
            opzioni={OPZIONI_ACCORDO}
            valore={bozza.accordoPreventivo}
            onCambia={(v) => aggiorna({ accordoPreventivo: v })}
            bloccato={bloccato}
          />
        </section>

        <section className="pannello">
          <h3>Messaggio cliente</h3>
          <textarea
            className="msg-box"
            value={bozza.messaggioCliente}
            disabled={bloccato}
            onChange={(e) => aggiorna({ messaggioCliente: e.target.value })}
          />
          <GruppoScelte
            etichetta="Giudizio messaggio"
            opzioni={OPZIONI_ESITO}
            valore={bozza.esitoMessaggio}
            onCambia={(v) => aggiorna({ esitoMessaggio: v })}
            bloccato={bloccato}
          />
          <textarea
            placeholder="Commento (obbligatorio se la risposta è 'No')"
            value={bozza.commentoMessaggio}
            disabled={bloccato}
            onChange={(e) => aggiorna({ commentoMessaggio: e.target.value })}
          />
          <GruppoScelte
            etichetta="D'accordo col giudice automatico sul messaggio?"
            opzioni={OPZIONI_ACCORDO}
            valore={bozza.accordoMessaggio}
            onCambia={(v) => aggiorna({ accordoMessaggio: v })}
            bloccato={bloccato}
          />
        </section>
      </div>

      {erroreRegistrazione && <p className="testo-errore">{erroreRegistrazione}</p>}
      {avviso && <p className="testo-conferma">{avviso}</p>}

      <div className="barra-azioni">
        <button
          type="button"
          className="posticipa-btn"
          disabled={stato !== "da_giudicare" || !altroDaGestire}
          onClick={posticipa}
        >
          Posticipa
        </button>
        <button
          type="button"
          className="submit-btn"
          disabled={stato !== "da_giudicare" || !giudizioCompleto || registrazioneInCorso}
          onClick={registra}
        >
          {registrazioneInCorso ? "Registrazione in corso…" : "Registra giudizio"}
        </button>
        <button
          type="button"
          className="send-btn"
          disabled={stato !== "giudicato" || !mailInviabile(bozza)}
          onClick={inviaMail}
        >
          Invia mail
        </button>
      </div>
    </div>
  );
}
