import { beforeEach, describe, expect, it, vi } from "vitest";

import { azzeraMemoriaCoda, caricaItemDaRivedere, registraGiudizioUmano } from "../lib/langfuse";
import { HOST, mockaFetchLangfuse as mockaFetch, rispostePerOsservazioni } from "./mock-langfuse";

describe("caricaItemDaRivedere", () => {
  beforeEach(() => {
    azzeraMemoriaCoda();
    process.env.LANGFUSE_HOST = HOST;
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
  });

  it("solleva un errore (non 'nessun item') se la coda 'revisione-preventivi' non esiste", async () => {
    mockaFetch({ "/api/public/annotation-queues?limit=100": { data: [] } });

    await expect(caricaItemDaRivedere()).rejects.toThrow(/Coda 'revisione-preventivi' non trovata/);
  });

  it("restituisce un elenco vuoto se non ci sono item non ancora giudicati", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": { data: [] },
    });

    expect(await caricaItemDaRivedere()).toEqual([]);
  });

  it("carica tutti gli item in attesa, anche su più pagine", async () => {
    const pagina1 = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}`, objectId: `trace-${i}` }));
    const traccia = {
      observations: [
        { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
        { name: "esecutore", input: {}, output: { preventivo: [], messaggio_cliente: "Testo" } },
        {
          name: "giudice-automatico",
          input: {},
          output: {
            verdetto_preventivo: { esito: "si", testo: "ok" },
            verdetto_messaggio: { esito: "si", testo: "ok" },
          },
        },
      ],
    };
    mockaFetch({
      "/api/public/annotation-queues?limit=100": { data: [{ id: "queue-1", name: "revisione-preventivi" }] },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": { data: pagina1 },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=2": {
        data: [{ id: "item-50", objectId: "trace-50" }],
      },
      ...rispostePerOsservazioni(
        Object.fromEntries([...pagina1.map((p) => p.objectId), "trace-50"].map((id) => [id, traccia.observations]))
      ),
    });

    const items = await caricaItemDaRivedere();
    expect(items).toHaveLength(51);
    expect(items[50].idTraccia).toBe("trace-50");
    expect(items[50].idItemCoda).toBe("item-50");
  });

  it("tiene l'osservazione più recente se un nome compare due volte nella stessa traccia", async () => {
    const base = (messaggio: string, startTime: string) => ({
      name: "esecutore",
      traceId: "trace-1",
      startTime,
      input: {},
      output: { preventivo: [], messaggio_cliente: messaggio },
    });
    const risposte = rispostePerOsservazioni({
      "trace-1": [
        { name: "pipeline-preventivo", input: { richiesta: "R" }, output: {} },
        {
          name: "giudice-automatico",
          input: {},
          output: {
            verdetto_preventivo: { esito: "si", testo: "ok" },
            verdetto_messaggio: { esito: "si", testo: "ok" },
          },
        },
      ],
    });
    risposte["/api/public/observations?name=esecutore&limit=100&page=1"] = {
      data: [base("vecchio", "2026-09-14T10:00:00Z"), base("recente", "2026-09-29T10:00:00Z")],
      meta: { totalPages: 1 },
    };
    mockaFetch({
      "/api/public/annotation-queues?limit=100": { data: [{ id: "queue-1", name: "revisione-preventivi" }] },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      ...risposte,
    });

    const [item] = await caricaItemDaRivedere();
    expect(item.messaggioCliente).toBe("recente");
  });

  it("scarta gli item della coda che puntano alla stessa traccia", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": { data: [{ id: "queue-1", name: "revisione-preventivi" }] },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
        data: [
          { id: "item-1", objectId: "trace-1" },
          { id: "item-2", objectId: "trace-1" },
        ],
      },
      ...rispostePerOsservazioni({
        "trace-1": [
          { name: "pipeline-preventivo", input: { richiesta: "R" }, output: {} },
          { name: "esecutore", input: {}, output: { preventivo: [], messaggio_cliente: "T" } },
          {
            name: "giudice-automatico",
            input: {},
            output: {
              verdetto_preventivo: { esito: "si", testo: "ok" },
              verdetto_messaggio: { esito: "si", testo: "ok" },
            },
          },
        ],
      }),
    });

    expect(await caricaItemDaRivedere()).toHaveLength(1);
  });

  it("due caricamenti ravvicinati condividono la stessa lettura della coda", async () => {
    const fetchMock = mockaFetch({
      "/api/public/annotation-queues?limit=100": { data: [{ id: "queue-1", name: "revisione-preventivi" }] },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": { data: [] },
    });

    await caricaItemDaRivedere();
    await caricaItemDaRivedere();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("riprova dopo un 429 aspettando il tempo indicato", async () => {
    vi.useFakeTimers();
    try {
      let chiamate = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(() => {
          chiamate++;
          if (chiamate === 1) {
            return Promise.resolve({ ok: false, status: 429, headers: new Headers({ "retry-after": "3" }) } as Response);
          }
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) } as Response);
        })
      );
      const verifica = expect(caricaItemDaRivedere()).rejects.toThrow(/Coda 'revisione-preventivi' non trovata/);
      await vi.advanceTimersByTimeAsync(3000);
      await verifica;
      expect(chiamate).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restituisce idMediaDocumento nullo se la traccia non ha ancora l'osservazione del documento", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      ...rispostePerOsservazioni({ "trace-1": [
          { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
          {
            name: "esecutore",
            input: {},
            output: { preventivo: [], messaggio_cliente: "Testo" },
          },
          {
            name: "giudice-automatico",
            input: {},
            output: {
              verdetto_preventivo: { esito: "si", testo: "ok" },
              verdetto_messaggio: { esito: "si", testo: "ok" },
            },
          },
        ] }),
    });

    const [item] = await caricaItemDaRivedere();
    expect(item.idMediaDocumento).toBeNull();
  });

  it("restituisce idMediaDocumento nullo (non un crash) se l'osservazione del documento esiste ma è ancora vuota", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      ...rispostePerOsservazioni({ "trace-1": [
          { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
          {
            name: "esecutore",
            input: {},
            output: { preventivo: [], messaggio_cliente: "Testo" },
          },
          {
            name: "giudice-automatico",
            input: {},
            output: {
              verdetto_preventivo: { esito: "si", testo: "ok" },
              verdetto_messaggio: { esito: "si", testo: "ok" },
            },
          },
          { name: "documento-preventivo", input: {}, output: {} },
        ] }),
    });

    const [item] = await caricaItemDaRivedere();
    expect(item.idMediaDocumento).toBeNull();
  });

  it("solleva un errore se il verdetto del giudice automatico è malformato", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      ...rispostePerOsservazioni({ "trace-1": [
          { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
          { name: "esecutore", input: {}, output: { preventivo: [], messaggio_cliente: "Testo" } },
          { name: "giudice-automatico", input: {}, output: { verdetto_preventivo: {}, verdetto_messaggio: {} } },
        ] }),
    });

    await expect(caricaItemDaRivedere()).rejects.toThrow(/verdetto_preventivo/);
  });

  it("solleva un errore se mancano le osservazioni di dominio attese sulla traccia", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=50&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      ...rispostePerOsservazioni({ "trace-1": [] }),
    });

    await expect(caricaItemDaRivedere()).rejects.toThrow(/osservazioni attese mancanti/);
  });
});

describe("registraGiudizioUmano", () => {
  beforeEach(() => {
    azzeraMemoriaCoda();
    process.env.LANGFUSE_HOST = HOST;
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
  });

  const RISPOSTE_BASE = {
    "/api/public/annotation-queues?limit=100": {
      data: [{ id: "queue-1", name: "revisione-preventivi" }],
    },
    "/api/public/score-configs?limit=100": {
      data: [
        { id: "config-verdetto-preventivo", name: "verdetto_preventivo" },
        { id: "config-accordo-preventivo", name: "accordo_preventivo" },
        { id: "config-verdetto-messaggio", name: "verdetto_messaggio" },
        { id: "config-accordo-messaggio", name: "accordo_messaggio" },
      ],
    },
    "POST /api/public/scores": { id: "score-x" },
    "PATCH /api/public/annotation-queues/queue-1/items/item-1": {},
  };

  it("scrive i quattro score con source ANNOTATION e configId corretto, poi marca l'item completato", async () => {
    const fetchMock = mockaFetch(RISPOSTE_BASE);

    await registraGiudizioUmano({
      idTraccia: "trace-1",
      idItemCoda: "item-1",
      esitoPreventivo: "no",
      commentoPreventivo: "Manca una voce",
      accordoPreventivo: false,
      esitoMessaggio: "si",
      commentoMessaggio: "",
      accordoMessaggio: true,
      messaggioClienteCorretto: "Testo corretto",
    });

    const chiamateScoreConfigs = fetchMock.mock.calls.filter(([url]) =>
      (url as string).endsWith("/api/public/score-configs?limit=100")
    );
    expect(chiamateScoreConfigs).toHaveLength(1);

    const chiamateScore = fetchMock.mock.calls
      .filter(([url]) => (url as string).endsWith("/api/public/scores"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));

    expect(chiamateScore).toHaveLength(4);
    expect(chiamateScore).toContainEqual({
      id: "trace-1-verdetto_preventivo",
      traceId: "trace-1",
      name: "verdetto_preventivo",
      value: "no",
      dataType: "CATEGORICAL",
      configId: "config-verdetto-preventivo",
      comment: "Manca una voce",
      metadata: undefined,
      source: "ANNOTATION",
    });
    expect(chiamateScore).toContainEqual({
      id: "trace-1-accordo_preventivo",
      traceId: "trace-1",
      name: "accordo_preventivo",
      value: 0,
      dataType: "BOOLEAN",
      configId: "config-accordo-preventivo",
      comment: undefined,
      metadata: undefined,
      source: "ANNOTATION",
    });
    expect(chiamateScore).toContainEqual({
      id: "trace-1-verdetto_messaggio",
      traceId: "trace-1",
      name: "verdetto_messaggio",
      value: "si",
      dataType: "CATEGORICAL",
      configId: "config-verdetto-messaggio",
      comment: undefined,
      metadata: { messaggio_cliente_corretto: "Testo corretto" },
      source: "ANNOTATION",
    });
    expect(chiamateScore).toContainEqual({
      id: "trace-1-accordo_messaggio",
      traceId: "trace-1",
      name: "accordo_messaggio",
      value: 1,
      dataType: "BOOLEAN",
      configId: "config-accordo-messaggio",
      comment: undefined,
      metadata: undefined,
      source: "ANNOTATION",
    });

    const chiamataPatch = fetchMock.mock.calls.find(([url]) =>
      (url as string).endsWith("/api/public/annotation-queues/queue-1/items/item-1")
    );
    expect(chiamataPatch?.[1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse((chiamataPatch?.[1] as RequestInit).body as string)).toEqual({ status: "COMPLETED" });
  });

  it("se una delle quattro scritture di score fallisce, non marca l'item come completato", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const percorso = (url as string).replace(HOST, "");
      const metodo = init?.method ?? "GET";
      if (metodo === "POST" && percorso === "/api/public/scores") {
        const corpo = JSON.parse(init!.body as string);
        if (corpo.name === "accordo_messaggio") {
          return Promise.resolve({ ok: false, status: 500 } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: "score-x" }) } as Response);
      }
      const corpo = (RISPOSTE_BASE as Record<string, unknown>)[percorso];
      if (corpo === undefined) throw new Error(`URL non mockato nel test: ${metodo} ${url}`);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(corpo) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      registraGiudizioUmano({
        idTraccia: "trace-1",
        idItemCoda: "item-1",
        esitoPreventivo: "si",
        commentoPreventivo: "",
        accordoPreventivo: true,
        esitoMessaggio: "si",
        commentoMessaggio: "",
        accordoMessaggio: true,
        messaggioClienteCorretto: "Testo",
      })
    ).rejects.toBeDefined();

    const chiamataPatch = fetchMock.mock.calls.find(([url]: [string, RequestInit?]) =>
      url.endsWith("/api/public/annotation-queues/queue-1/items/item-1")
    );
    expect(chiamataPatch).toBeUndefined();
  });
});

