import { vi } from "vitest";

export const HOST = "https://langfuse.test";

/** Mocka `global.fetch` con una mappa percorso → corpo JSON, per non fare chiamate reali a
 * Langfuse nei test. Condiviso tra i test di `lib/langfuse.ts` e quelli del componente. Le
 * chiamate GET si cercano per solo percorso (compatibilità coi mock esistenti); le chiamate con
 * un metodo diverso (POST, PATCH) si cercano SOLO con la chiave `"METODO percorso"` — niente
 * fallback sul percorso nudo, altrimenti una scrittura senza mock proprio restituirebbe in
 * silenzio la risposta mockata per la GET sullo stesso path invece di far fallire il test.
 * Restituisce il mock per permettere ai test di ispezionare le chiamate (`fetchMock.mock.calls`). */
export function mockaFetchLangfuse(risposte: Record<string, unknown>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const percorso = url.replace(HOST, "");
    const metodo = init?.method ?? "GET";
    const corpo = metodo === "GET" ? risposte[percorso] : risposte[`${metodo} ${percorso}`];
    if (corpo === undefined) throw new Error(`URL non mockato nel test: ${metodo} ${url}`);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(corpo),
    } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Risposte della lista di osservazioni (una chiamata per nome, per tutte le tracce) a partire dalle
 * osservazioni di ciascuna traccia. */
export function rispostePerOsservazioni(
  tracce: Record<string, { name: string; input: unknown; output: unknown }[]>
): Record<string, unknown> {
  const nomi = ["pipeline-preventivo", "esecutore", "giudice-automatico", "documento-preventivo"];
  return Object.fromEntries(
    nomi.map((nome) => [
      `/api/public/observations?name=${nome}&limit=100&page=1`,
      {
        data: Object.entries(tracce).flatMap(([traceId, osservazioni]) =>
          osservazioni.filter((o) => o.name === nome).map((o) => ({ ...o, traceId }))
        ),
        meta: { totalPages: 1 },
      },
    ])
  );
}
