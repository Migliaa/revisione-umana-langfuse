import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ItemDaRivedereView } from "../components/ItemDaRivedereView";
import type { ItemDaRivedere } from "../lib/tipi";

const ITEM: ItemDaRivedere = {
  idTraccia: "trace-1",
  idItemCoda: "item-1",
  richiestaCliente: "Vorrei tinteggiare 80 mq",
  preventivo: [{ voce: "Pittura lavabile bianca", quantita: 80, prezzo_unitario: 12, totale: 960 }],
  messaggioCliente: "Buongiorno, in allegato il preventivo.",
  documentoUrl: null,
  verdettoPreventivo: { esito: "si", testo: "Coerente col catalogo." },
  verdettoMessaggio: { esito: "da_rivedere", testo: "Tono troppo informale." },
};

const ITEM_2: ItemDaRivedere = {
  ...ITEM,
  idTraccia: "trace-2",
  idItemCoda: "item-2",
  richiestaCliente: "Vorrei imbiancare una stanza",
  messaggioCliente: "Secondo messaggio.",
};

const ITEM_3: ItemDaRivedere = {
  ...ITEM,
  idTraccia: "trace-3",
  idItemCoda: "item-3",
  richiestaCliente: "Vorrei sostituire sei finestre",
  messaggioCliente: "Terzo messaggio.",
};

const COMMENTO = "Commento (obbligatorio se la risposta è 'No')";

function scegli(gruppo: string, risposta: "Sì" | "No") {
  const g = screen.getByRole("group", { name: gruppo });
  fireEvent.click(within(g).getByRole("button", { name: risposta }));
}

function completaTuttiIGiudizi(esitoPreventivo: "Sì" | "No" = "Sì") {
  scegli("Giudizio preventivo", esitoPreventivo);
  scegli("D'accordo col giudice automatico sul preventivo?", "Sì");
  scegli("Giudizio messaggio", "Sì");
  scegli("D'accordo col giudice automatico sul messaggio?", "Sì");
  if (esitoPreventivo === "No") {
    const [commentoPreventivo] = screen.getAllByPlaceholderText(COMMENTO);
    fireEvent.change(commentoPreventivo, { target: { value: "Manca una voce" } });
  }
}

const registra = () => screen.getByRole("button", { name: "Registra giudizio" });
const posticipa = () => screen.getByRole("button", { name: "Posticipa" });
const inviaMail = () => screen.getByRole("button", { name: "Invia mail" });

function renderiza(items: ItemDaRivedere[], registraGiudizio = vi.fn().mockResolvedValue(undefined)) {
  render(<ItemDaRivedereView items={items} catalogo={[]} registraGiudizio={registraGiudizio} />);
  return registraGiudizio;
}

describe("area di lavoro del revisore", () => {
  it("il messaggio cliente è modificabile", () => {
    renderiza([ITEM]);

    const campo = screen.getByDisplayValue("Buongiorno, in allegato il preventivo.");
    fireEvent.change(campo, { target: { value: "Testo corretto dal revisore." } });

    expect(screen.getByDisplayValue("Testo corretto dal revisore.")).toBeInTheDocument();
  });

  it("il revisore risponde solo Sì o No: non esiste un'opzione 'Da rivedere' tra le sue scelte", () => {
    renderiza([ITEM]);

    for (const gruppo of ["Giudizio preventivo", "Giudizio messaggio"]) {
      const bottoni = within(screen.getByRole("group", { name: gruppo })).getAllByRole("button");
      expect(bottoni.map((b) => b.textContent)).toEqual(["Sì", "No"]);
    }
  });

  it("'Registra giudizio' resta disabilitato finché i quattro giudizi non sono completi", () => {
    renderiza([ITEM]);
    expect(registra()).toBeDisabled();

    scegli("Giudizio preventivo", "Sì");
    expect(registra()).toBeDisabled();

    completaTuttiIGiudizi();
    expect(registra()).toBeEnabled();
  });

  it("il commento è obbligatorio quando la risposta è 'No'", () => {
    renderiza([ITEM]);

    completaTuttiIGiudizi();
    expect(registra()).toBeEnabled();

    scegli("Giudizio preventivo", "No");
    expect(registra()).toBeDisabled();

    const [commentoPreventivo] = screen.getAllByPlaceholderText(COMMENTO);
    fireEvent.change(commentoPreventivo, { target: { value: "Manca una voce di catalogo" } });
    expect(registra()).toBeEnabled();
  });

  it("registrare chiama registraGiudizio coi valori scelti", async () => {
    const registraGiudizio = renderiza([ITEM]);

    completaTuttiIGiudizi("No");
    fireEvent.click(registra());

    await waitFor(() => expect(inviaMail()).toBeDisabled());
    expect(registraGiudizio).toHaveBeenCalledWith({
      idTraccia: "trace-1",
      idItemCoda: "item-1",
      esitoPreventivo: "no",
      commentoPreventivo: "Manca una voce",
      accordoPreventivo: true,
      esitoMessaggio: "si",
      commentoMessaggio: "",
      accordoMessaggio: true,
      messaggioClienteCorretto: "Buongiorno, in allegato il preventivo.",
    });
  });

  it("se la registrazione fallisce, mostra il messaggio d'errore specifico e lascia modificabile il giudizio", async () => {
    const registraGiudizio = vi.fn().mockRejectedValue(new Error("Score config 'accordo_messaggio' non trovata"));
    renderiza([ITEM], registraGiudizio);

    completaTuttiIGiudizi();
    fireEvent.click(registra());

    expect(await screen.findByText("Score config 'accordo_messaggio' non trovata")).toBeInTheDocument();
    expect(inviaMail()).toBeDisabled();
    expect(registra()).toBeEnabled();
  });

  it("senza item mostra lo stato vuoto", () => {
    renderiza([]);
    expect(screen.getByText("Nessun preventivo da rivedere al momento.")).toBeInTheDocument();
  });
});

describe("invio della mail", () => {
  it("'Invia mail' è disabilitato finché il giudizio non è registrato", () => {
    renderiza([ITEM]);
    expect(inviaMail()).toBeDisabled();

    completaTuttiIGiudizi();
    expect(inviaMail()).toBeDisabled();
  });

  it("dopo la registrazione 'Invia mail' si abilita e mostra una conferma senza chiamate di rete", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    renderiza([ITEM]);

    completaTuttiIGiudizi();
    fireEvent.click(registra());
    await waitFor(() => expect(inviaMail()).toBeEnabled());

    fireEvent.click(inviaMail());

    expect(screen.getByText("Mail inviata (simulata).")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("con 'No' sul preventivo la mail non si può inviare", async () => {
    renderiza([ITEM]);

    completaTuttiIGiudizi("No");
    fireEvent.click(registra());

    expect(await screen.findByText(/la mail non si invia/i)).toBeInTheDocument();
    expect(inviaMail()).toBeDisabled();
  });

  it("con 'No' sul solo messaggio la mail si può inviare", async () => {
    renderiza([ITEM]);

    scegli("Giudizio preventivo", "Sì");
    scegli("D'accordo col giudice automatico sul preventivo?", "Sì");
    scegli("Giudizio messaggio", "No");
    scegli("D'accordo col giudice automatico sul messaggio?", "No");
    const commenti = screen.getAllByPlaceholderText(COMMENTO);
    fireEvent.change(commenti[1], { target: { value: "Tono troppo informale" } });
    fireEvent.click(registra());

    await waitFor(() => expect(inviaMail()).toBeEnabled());
  });

  it("dopo la registrazione il giudizio non è più modificabile", async () => {
    renderiza([ITEM]);

    completaTuttiIGiudizi();
    fireEvent.click(registra());
    await waitFor(() => expect(inviaMail()).toBeEnabled());

    const g = screen.getByRole("group", { name: "Giudizio preventivo" });
    expect(within(g).getByRole("button", { name: "No" })).toBeDisabled();
    expect(screen.getByDisplayValue("Buongiorno, in allegato il preventivo.")).toBeDisabled();
  });
});

describe("più preventivi da giudicare", () => {
  it("l'elenco mostra tutti gli item con il loro stato", () => {
    renderiza([ITEM, ITEM_2]);

    const elenco = screen.getByRole("navigation", { name: "Preventivi del lotto" });
    expect(within(elenco).getByText(/Vorrei tinteggiare 80 mq/)).toBeInTheDocument();
    expect(within(elenco).getByText(/Vorrei imbiancare una stanza/)).toBeInTheDocument();
    expect(within(elenco).getAllByText("Da giudicare")).toHaveLength(2);
  });

  it("cliccando una voce dell'elenco si passa a quell'item", () => {
    renderiza([ITEM, ITEM_2]);

    const elenco = screen.getByRole("navigation", { name: "Preventivi del lotto" });
    fireEvent.click(within(elenco).getByText(/Vorrei imbiancare una stanza/));

    expect(screen.getByDisplayValue("Secondo messaggio.")).toBeInTheDocument();
  });

  it("le scelte di un item restano quando si va su un altro e si torna indietro", () => {
    renderiza([ITEM, ITEM_2]);
    const elenco = screen.getByRole("navigation", { name: "Preventivi del lotto" });

    scegli("Giudizio preventivo", "Sì");
    fireEvent.click(within(elenco).getByText(/Vorrei imbiancare una stanza/));
    fireEvent.click(within(elenco).getByText(/Vorrei tinteggiare 80 mq/));

    const g = screen.getByRole("group", { name: "Giudizio preventivo" });
    expect(within(g).getByRole("button", { name: "Sì" })).toHaveAttribute("aria-pressed", "true");
  });

  it("'Posticipa' salta al prossimo item senza scrivere nulla e manda questo in fondo all'elenco", () => {
    const registraGiudizio = renderiza([ITEM, ITEM_2, ITEM_3]);

    fireEvent.click(posticipa());

    expect(screen.getByDisplayValue("Secondo messaggio.")).toBeInTheDocument();
    expect(registraGiudizio).not.toHaveBeenCalled();
    const voci = within(screen.getByRole("navigation", { name: "Preventivi del lotto" })).getAllByRole("button");
    expect(voci.map((v) => v.textContent)).toEqual([
      expect.stringContaining("1. Vorrei imbiancare una stanza"),
      expect.stringContaining("2. Vorrei sostituire sei finestre"),
      expect.stringContaining("3. Vorrei tinteggiare 80 mq"),
    ]);
  });

  it("'Posticipa' è disabilitato se non c'è un altro item da gestire", () => {
    renderiza([ITEM]);
    expect(posticipa()).toBeDisabled();
  });

  it("'Posticipa' non compare come esito del giudizio: sta nella barra delle azioni", () => {
    renderiza([ITEM, ITEM_2]);

    const barra = screen.getByRole("button", { name: "Registra giudizio" }).parentElement!;
    expect(within(barra).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Posticipa",
      "Registra giudizio",
      "Invia mail",
    ]);
  });

  it("dopo l'invio della mail si passa all'item successivo e l'elenco segna il precedente come inviato", async () => {
    renderiza([ITEM, ITEM_2]);

    completaTuttiIGiudizi();
    fireEvent.click(registra());
    await waitFor(() => expect(inviaMail()).toBeEnabled());
    fireEvent.click(inviaMail());

    expect(screen.getByDisplayValue("Secondo messaggio.")).toBeInTheDocument();
    const elenco = screen.getByRole("navigation", { name: "Preventivi del lotto" });
    expect(within(elenco).getByText("Mail inviata")).toBeInTheDocument();
  });

  it("registrare un item con 'No' sul preventivo passa direttamente al successivo", async () => {
    renderiza([ITEM, ITEM_2]);

    completaTuttiIGiudizi("No");
    fireEvent.click(registra());

    expect(await screen.findByDisplayValue("Secondo messaggio.")).toBeInTheDocument();
    const elenco = screen.getByRole("navigation", { name: "Preventivi del lotto" });
    expect(within(elenco).getByText("Giudicato · nessuna mail")).toBeInTheDocument();
  });

  it("quando tutti gli item sono gestiti lo dice", async () => {
    renderiza([ITEM]);

    completaTuttiIGiudizi();
    fireEvent.click(registra());
    await waitFor(() => expect(inviaMail()).toBeEnabled());
    expect(screen.queryByText("Tutti i preventivi sono stati gestiti.")).not.toBeInTheDocument();

    fireEvent.click(inviaMail());
    expect(screen.getByText("Tutti i preventivi sono stati gestiti.")).toBeInTheDocument();
  });
});
