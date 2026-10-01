export type RigaPreventivo = {
  voce: string;
  quantita: number;
  prezzo_unitario: number;
  totale: number;
};

export type Verdetto = {
  esito: "si" | "da_rivedere" | "no";
  testo: string;
};

/** Il revisore umano risponde solo sì o no; "da rivedere" esiste solo come esito del giudice automatico. */
export type EsitoUmano = "si" | "no";

export type ItemDaRivedere = {
  idTraccia: string;
  idItemCoda: string;
  richiestaCliente: string;
  preventivo: RigaPreventivo[];
  messaggioCliente: string;
  documentoUrl: string | null;
  /** Riferimento al PDF su Langfuse, risolto in un URL solo quando il revisore apre la scheda Documento. */
  idMediaDocumento?: string | null;
  verdettoPreventivo: Verdetto;
  verdettoMessaggio: Verdetto;
};

export type VoceCatalogo = {
  voce: string;
  unita: string;
  prezzo_unitario: number;
};

export type GiudizioUmano = {
  idTraccia: string;
  idItemCoda: string;
  esitoPreventivo: EsitoUmano;
  commentoPreventivo: string;
  accordoPreventivo: boolean;
  esitoMessaggio: EsitoUmano;
  commentoMessaggio: string;
  accordoMessaggio: boolean;
  messaggioClienteCorretto: string;
};
