import type { GiudizioUmano, ItemDaRivedere, RigaPreventivo, Verdetto } from "./tipi";

const NOME_QUEUE = "revisione-preventivi";
const RIFERIMENTO_MEDIA = /id=([^|]+)/;

function configurazione() {
  const host = process.env.LANGFUSE_HOST;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!host || !publicKey || !secretKey) {
    throw new Error(
      "Configurazione Langfuse mancante: impostare LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY e LANGFUSE_SECRET_KEY."
    );
  }
  return { host, publicKey, secretKey };
}

const TENTATIVI_SU_429 = 5;

async function chiamaApiLangfuse<T>(
  percorso: string,
  opzioni: { metodo?: string; corpo?: unknown } = {}
): Promise<T> {
  const { host, publicKey, secretKey } = configurazione();
  const autenticazione = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  // Il piano gratuito limita le richieste al minuto: sui 429 si riprova aspettando quanto indicato.
  for (let tentativo = 0; ; tentativo++) {
    const risposta = await fetch(`${host}${percorso}`, {
      method: opzioni.metodo ?? "GET",
      headers: {
        Authorization: `Basic ${autenticazione}`,
        ...(opzioni.corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opzioni.corpo !== undefined ? JSON.stringify(opzioni.corpo) : undefined,
      cache: "no-store",
    });
    if (risposta.status === 429 && tentativo < TENTATIVI_SU_429) {
      const attesa = Number(risposta.headers?.get("retry-after")) || 2 ** tentativo;
      await new Promise((risolvi) => setTimeout(risolvi, Math.min(attesa, 65) * 1000));
      continue;
    }
    if (!risposta.ok) {
      throw new Error(`Chiamata a ${percorso} fallita con stato ${risposta.status}`);
    }
    return (await risposta.json()) as T;
  }
}

/** La coda deve esistere già (creata da `run_pipeline.py` lato backend) — se manca è un problema
 * di configurazione (host/progetto Langfuse sbagliato), non uno stato normale, quindi si segnala
 * con un errore esplicito invece di confonderlo con "nessun item da giudicare". */
async function trovaIdCoda(): Promise<string> {
  const risposta = await chiamaApiLangfuse<{ data: { id: string; name: string }[] }>(
    "/api/public/annotation-queues?limit=100"
  );
  const idCoda = risposta.data.find((coda) => coda.name === NOME_QUEUE)?.id;
  if (!idCoda) {
    throw new Error(
      `Coda '${NOME_QUEUE}' non trovata sul progetto Langfuse configurato: verificare LANGFUSE_HOST/LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY, oppure eseguire prima run_pipeline.py nel backend.`
    );
  }
  return idCoda;
}

const ITEM_PER_PAGINA = 50;

/** Tutta la coda ancora da giudicare, non un item per volta: l'interfaccia fa scegliere
 * al revisore l'ordine e gli permette di posticipare un preventivo senza scrivere nulla su Langfuse. */
async function trovaItemCodaInAttesa(idCoda: string): Promise<{ idTraccia: string; idItemCoda: string }[]> {
  const trovati: { idTraccia: string; idItemCoda: string }[] = [];
  for (let pagina = 1; ; pagina++) {
    const risposta = await chiamaApiLangfuse<{ data: { id: string; objectId: string }[] }>(
      `/api/public/annotation-queues/${idCoda}/items?status=PENDING&limit=${ITEM_PER_PAGINA}&page=${pagina}`
    );
    for (const item of risposta.data) trovati.push({ idTraccia: item.objectId, idItemCoda: item.id });
    if (risposta.data.length < ITEM_PER_PAGINA) return trovati;
  }
}

type Osservazione = { name: string; traceId: string; startTime?: string; input: unknown; output: unknown };
type OsservazioniPerTraccia = Map<string, Osservazione>;

const NOMI_OSSERVAZIONI = ["pipeline-preventivo", "esecutore", "giudice-automatico", "documento-preventivo"] as const;

/** Le osservazioni di un nome, per tutte le tracce, in una chiamata sola invece di una per traccia:
 * il piano gratuito di Langfuse concede 5 letture al minuto, quindi leggere la traccia di ogni item
 * non regge una coda di qualche item. Se una traccia ha lo stesso nome più volte (lotti rilanciati)
 * vale la più recente. */
async function caricaOsservazioniPerNome(nome: string, tracce: Set<string>): Promise<OsservazioniPerTraccia> {
  const trovate: OsservazioniPerTraccia = new Map();
  for (let pagina = 1; ; pagina++) {
    const risposta = await chiamaApiLangfuse<{ data: Osservazione[]; meta: { totalPages: number } }>(
      `/api/public/observations?name=${nome}&limit=100&page=${pagina}`
    );
    for (const osservazione of risposta.data) {
      if (!tracce.has(osservazione.traceId)) continue;
      const precedente = trovate.get(osservazione.traceId);
      if (!precedente || (osservazione.startTime ?? "") > (precedente.startTime ?? "")) {
        trovate.set(osservazione.traceId, osservazione);
      }
    }
    if (pagina >= risposta.meta.totalPages) return trovate;
  }
}

async function costruisciItem(
  idTraccia: string,
  idItemCoda: string,
  osservazioni: Record<(typeof NOMI_OSSERVAZIONI)[number], OsservazioniPerTraccia>
): Promise<ItemDaRivedere> {
  const pipeline = osservazioni["pipeline-preventivo"].get(idTraccia);
  const esecutore = osservazioni["esecutore"].get(idTraccia);
  const giudiceAutomatico = osservazioni["giudice-automatico"].get(idTraccia);
  const documento = osservazioni["documento-preventivo"].get(idTraccia);

  if (!pipeline || !esecutore || !giudiceAutomatico) {
    throw new Error(`Traccia ${idTraccia}: osservazioni attese mancanti`);
  }

  const outputGiudice = giudiceAutomatico.output as {
    verdetto_preventivo?: unknown;
    verdetto_messaggio?: unknown;
  } | null;

  let idMediaDocumento: string | null = null;
  if (documento) {
    const idDocumento = documento.output as { documento?: unknown } | null;
    if (typeof idDocumento?.documento === "string") {
      const idMedia = idDocumento.documento.match(RIFERIMENTO_MEDIA)?.[1];
      if (idMedia) idMediaDocumento = idMedia;
    }
  }

  const { preventivo, messaggioCliente } = estraiEsecutore(esecutore, idTraccia);

  return {
    idTraccia,
    idItemCoda,
    richiestaCliente: estraiRichiesta(pipeline, idTraccia),
    preventivo,
    messaggioCliente,
    documentoUrl: null,
    idMediaDocumento,
    verdettoPreventivo: estraiVerdetto(outputGiudice?.verdetto_preventivo, "verdetto_preventivo", idTraccia),
    verdettoMessaggio: estraiVerdetto(outputGiudice?.verdetto_messaggio, "verdetto_messaggio", idTraccia),
  };
}

/** Il nome di ogni score coincide col nome della sua score config (vedi `SCORE_CONFIGS` lato
 * backend, `backend/giudice_pipeline/langfuse_gateway.py`): risolte per nome in un'unica chiamata
 * invece che una per score, dato che le quattro config esistono già dal primo avvio della
 * pipeline e non cambiano tra un giudizio e l'altro. */
async function caricaMappaScoreConfig(): Promise<Record<string, string>> {
  const risposta = await chiamaApiLangfuse<{ data: { id: string; name: string }[] }>(
    "/api/public/score-configs?limit=100"
  );
  return Object.fromEntries(risposta.data.map((config) => [config.name, config.id]));
}

function idScoreConfig(mappa: Record<string, string>, nome: string): string {
  const id = mappa[nome];
  if (!id) {
    throw new Error(
      `Score config '${nome}' non trovata sul progetto Langfuse configurato: eseguire prima run_pipeline.py nel backend, che la crea al primo avvio.`
    );
  }
  return id;
}

type ScoreDaScrivere = {
  nome: string;
  valore: string | number;
  dataType: "CATEGORICAL" | "BOOLEAN";
  commento?: string;
  metadata?: Record<string, unknown>;
};

/** Un `id` deterministico (traccia + nome score) rende la scrittura idempotente: un retry dopo un
 * fallimento parziale sovrascrive lo score già scritto invece di duplicarlo. */
async function scriviScore(
  idTraccia: string,
  mappaConfig: Record<string, string>,
  score: ScoreDaScrivere
): Promise<void> {
  await chiamaApiLangfuse("/api/public/scores", {
    metodo: "POST",
    corpo: {
      id: `${idTraccia}-${score.nome}`,
      traceId: idTraccia,
      name: score.nome,
      value: score.valore,
      dataType: score.dataType,
      configId: idScoreConfig(mappaConfig, score.nome),
      comment: score.commento || undefined,
      metadata: score.metadata,
      source: "ANNOTATION",
    },
  });
}

/** Scrive i quattro score del giudizio umano (source ANNOTATION, a differenza di quelli
 * automatici scritti dal backend con source API) e marca l'item come completato in coda —
 * altrimenti ricomparirebbe al prossimo caricamento. Il testo del messaggio cliente eventualmente
 * corretto dal revisore viene allegato come metadata allo score 'verdetto_messaggio', altrimenti
 * andrebbe perso: non c'è altro posto dove salvarlo. */
export async function registraGiudizioUmano(giudizio: GiudizioUmano): Promise<void> {
  azzeraMemoriaCoda();
  const idCoda = await trovaIdCoda();
  const mappaConfig = await caricaMappaScoreConfig();

  const risultati = await Promise.allSettled([
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "verdetto_preventivo",
      valore: giudizio.esitoPreventivo,
      dataType: "CATEGORICAL",
      commento: giudizio.commentoPreventivo,
    }),
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "accordo_preventivo",
      valore: giudizio.accordoPreventivo ? 1 : 0,
      dataType: "BOOLEAN",
    }),
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "verdetto_messaggio",
      valore: giudizio.esitoMessaggio,
      dataType: "CATEGORICAL",
      commento: giudizio.commentoMessaggio,
      metadata: { messaggio_cliente_corretto: giudizio.messaggioClienteCorretto },
    }),
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "accordo_messaggio",
      valore: giudizio.accordoMessaggio ? 1 : 0,
      dataType: "BOOLEAN",
    }),
  ]);

  const fallito = risultati.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (fallito) {
    throw fallito.reason;
  }

  await chiamaApiLangfuse(`/api/public/annotation-queues/${idCoda}/items/${giudizio.idItemCoda}`, {
    metodo: "PATCH",
    corpo: { status: "COMPLETED" },
  });
}

/** Risolto a richiesta e non per tutti gli item insieme: ogni lettura conta nel limite di richieste. */
export async function risolviUrlDocumento(idMedia: string): Promise<string> {
  const risposta = await chiamaApiLangfuse<{ url: string }>(`/api/public/media/${idMedia}`);
  return risposta.url;
}

function estraiRichiesta(pipeline: Osservazione, idTraccia: string): string {
  const input = pipeline.input as { richiesta?: unknown } | null;
  if (typeof input?.richiesta !== "string") {
    throw new Error(`Traccia ${idTraccia}: 'pipeline-preventivo' priva di input.richiesta`);
  }
  return input.richiesta;
}

function estraiEsecutore(
  esecutore: Osservazione,
  idTraccia: string
): { preventivo: RigaPreventivo[]; messaggioCliente: string } {
  const output = esecutore.output as { preventivo?: unknown; messaggio_cliente?: unknown } | null;
  if (!Array.isArray(output?.preventivo) || typeof output?.messaggio_cliente !== "string") {
    throw new Error(`Traccia ${idTraccia}: 'esecutore' priva di preventivo/messaggio_cliente validi`);
  }
  return { preventivo: output.preventivo as RigaPreventivo[], messaggioCliente: output.messaggio_cliente };
}

function estraiVerdetto(verdetto: unknown, campo: string, idTraccia: string): Verdetto {
  const v = verdetto as { esito?: unknown; testo?: unknown } | null;
  if (typeof v?.esito !== "string" || typeof v?.testo !== "string") {
    throw new Error(`Traccia ${idTraccia}: '${campo}' privo di esito/testo validi`);
  }
  return v as Verdetto;
}

/** Combina le chiamate di sola lettura necessarie per mostrare la coda: risolve la coda per nome,
 * prende gli item non ancora giudicati dall'umano, ne legge le osservazioni di dominio e, se
 * presente, tiene il riferimento media del documento preventivo.
 * Restituisce un elenco vuoto solo per lo stato legittimo "nessun item da giudicare" — una coda
 * mancante o dati malformati sono errori. */
async function leggiCoda(): Promise<ItemDaRivedere[]> {
  const idCoda = await trovaIdCoda();
  const inAttesa = await trovaItemCodaInAttesa(idCoda);
  const visti = new Set<string>();
  const unici = inAttesa.filter(({ idTraccia }) => !visti.has(idTraccia) && visti.add(idTraccia));
  if (unici.length === 0) return [];

  const osservazioni = {} as Record<(typeof NOMI_OSSERVAZIONI)[number], OsservazioniPerTraccia>;
  for (const nome of NOMI_OSSERVAZIONI) osservazioni[nome] = await caricaOsservazioniPerNome(nome, visti);

  const items: ItemDaRivedere[] = [];
  for (const { idTraccia, idItemCoda } of unici) items.push(await costruisciItem(idTraccia, idItemCoda, osservazioni));
  return items;
}

const DURATA_MEMORIA_MS = 30_000;
let memoria: { letta: number; coda: Promise<ItemDaRivedere[]> } | null = null;

/** Rilegge la coda solo se l'ultima lettura ha più di 30 secondi: più rendering ravvicinati della
 * stessa pagina (o un ricaricamento) condividono la stessa lettura invece di consumare il limite. */
export async function caricaItemDaRivedere(): Promise<ItemDaRivedere[]> {
  if (!memoria || Date.now() - memoria.letta > DURATA_MEMORIA_MS) {
    const coda = leggiCoda();
    memoria = { letta: Date.now(), coda };
    coda.catch(() => {
      if (memoria?.coda === coda) memoria = null;
    });
  }
  return memoria.coda;
}

export function azzeraMemoriaCoda(): void {
  memoria = null;
}
