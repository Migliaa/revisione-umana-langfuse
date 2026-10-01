import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ItemDaRivedereView } from "../components/ItemDaRivedereView";
import { caricaCatalogo } from "../lib/catalogo";
import { azzeraMemoriaCoda, caricaItemDaRivedere, risolviUrlDocumento } from "../lib/langfuse";
import { HOST, mockaFetchLangfuse, rispostePerOsservazioni } from "./mock-langfuse";

const RISPOSTE: Record<string, unknown> = {
  "/api/public/annotation-queues?limit=100": {
    data: [{ id: "queue-1", name: "revisione-preventivi" }],
  },
  "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
    data: [{ id: "item-1", objectId: "trace-1" }],
  },
  ...rispostePerOsservazioni({ "trace-1": [
      { name: "pipeline-preventivo", input: { richiesta: "Vorrei tinteggiare 80 mq" }, output: {} },
      {
        name: "esecutore",
        input: {},
        output: {
          preventivo: [{ voce: "Pittura lavabile bianca", quantita: 80, prezzo_unitario: 12, totale: 960 }],
          messaggio_cliente: "Buongiorno, in allegato il preventivo.",
        },
      },
      {
        name: "giudice-automatico",
        input: {},
        output: {
          verdetto_preventivo: { esito: "si", testo: "Coerente col catalogo." },
          verdetto_messaggio: { esito: "da_rivedere", testo: "Tono troppo informale." },
        },
      },
      {
        name: "documento-preventivo",
        input: {},
        output: { documento: "@@@langfuseMedia:type=application/pdf|id=media-1|source=bytes@@@" },
      },
    ] }),
  "/api/public/media/media-1": { url: "https://storage.example/documento.pdf" },
};

describe("lettura dell'item di coda", () => {
  beforeEach(() => {
    azzeraMemoriaCoda();
    process.env.LANGFUSE_HOST = HOST;
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    mockaFetchLangfuse(RISPOSTE);
  });

  it("mostra richiesta, preventivo, i due verdetti separati e il documento (risolto all'apertura della scheda), con i dati dell'item mockato", async () => {
    const items = await caricaItemDaRivedere();
    expect(items).toHaveLength(1);

    render(
      <ItemDaRivedereView
        items={items}
        catalogo={caricaCatalogo()}
        registraGiudizio={async () => {}}
        risolviUrlDocumento={risolviUrlDocumento}
      />
    );

    expect(screen.getByText("Vorrei tinteggiare 80 mq")).toBeInTheDocument();
    expect(screen.getByText(/Pittura lavabile bianca/)).toBeInTheDocument();
    expect(screen.getAllByText("960.00 €").length).toBeGreaterThan(0);
    expect(screen.getByText("Coerente col catalogo.")).toBeInTheDocument();
    expect(screen.getByText("Tono troppo informale.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Buongiorno, in allegato il preventivo.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Documento" }));
    expect(await screen.findByTitle("Anteprima documento preventivo")).toHaveAttribute(
      "src",
      "https://storage.example/documento.pdf"
    );
  });

  it("il catalogo di riferimento resta nascosto finché non viene richiamato esplicitamente", async () => {
    const items = await caricaItemDaRivedere();
    render(<ItemDaRivedereView items={items} catalogo={caricaCatalogo()} registraGiudizio={async () => {}} />);

    expect(screen.queryByText(/€ \/ mq/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Vedi catalogo di riferimento"));
    expect(screen.getAllByText(/€ \/ /).length).toBeGreaterThan(0);
  });

  it("non mostra terminologia tecnica Langfuse", async () => {
    const items = await caricaItemDaRivedere();
    render(<ItemDaRivedereView items={items} catalogo={caricaCatalogo()} registraGiudizio={async () => {}} />);

    const testoPagina = (document.body.textContent ?? "").toLowerCase();
    for (const termine of ["trace", "observation", "score config", "queue"]) {
      expect(testoPagina).not.toContain(termine);
    }
  });
});
