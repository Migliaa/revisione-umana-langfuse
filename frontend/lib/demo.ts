import type { GiudizioUmano, ItemDaRivedere, VoceCatalogo } from "./tipi";

/** Dati fittizi per far provare l'interfaccia senza credenziali Langfuse reali (usati quando
 * `LANGFUSE_HOST`/`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` non sono configurate — vedi
 * `app/page.tsx`). Nessun segreto qui: modulo sicuro da importare anche lato client. */
export const catalogoDemo: VoceCatalogo[] = [
  { voce: "Pittura lavabile bianca", unita: "mq", prezzo_unitario: 12 },
  { voce: "Finestra doppio vetro 120x150", unita: "pezzo", prezzo_unitario: 450 },
  { voce: "Smontaggio e smaltimento vecchi infissi", unita: "pezzo", prezzo_unitario: 60 },
  { voce: "Posa in opera infissi", unita: "pezzo", prezzo_unitario: 70 },
  { voce: "Pulizia fine cantiere", unita: "mq", prezzo_unitario: 9 },
  { voce: "Maggiorazione urgenza", unita: "intervento", prezzo_unitario: 50 },
];

export const datiDemo: ItemDaRivedere[] = [
  {
    idTraccia: "demo-1",
    idItemCoda: "demo-item-1",
    richiestaCliente: "Vorrei un preventivo per la tinteggiatura di un salone di 60 mq, colore bianco lavabile.",
    preventivo: [{ voce: "Pittura lavabile bianca", quantita: 60, prezzo_unitario: 12, totale: 720 }],
    messaggioCliente:
      "Gentile Cliente, la ringraziamo per la richiesta. In allegato il preventivo per la tinteggiatura del salone (60 mq, pittura lavabile bianca), per un totale di 720,00 €. Restiamo a disposizione.",
    documentoUrl: null,
    verdettoPreventivo: { esito: "si", testo: "Voce e quantità coerenti col catalogo e con la richiesta." },
    verdettoMessaggio: { esito: "si", testo: "Tono professionale, riferimenti a mq e totale corretti." },
  },
  {
    idTraccia: "demo-2",
    idItemCoda: "demo-item-2",
    richiestaCliente: "Preventivo per la sostituzione di 4 finestre in doppio vetro, entro due settimane.",
    preventivo: [
      { voce: "Finestra doppio vetro 120x150", quantita: 4, prezzo_unitario: 450, totale: 1800 },
      { voce: "Posa in opera infissi", quantita: 4, prezzo_unitario: 70, totale: 280 },
    ],
    messaggioCliente:
      "Gentile Cliente, in allegato il preventivo per la sostituzione di 4 finestre in doppio vetro, con posa in opera inclusa, per un totale di 2.080,00 €. Ci impegniamo a completare l'intervento entro due settimane.",
    documentoUrl: null,
    verdettoPreventivo: {
      esito: "da_rivedere",
      testo:
        "Manca la voce di smontaggio e smaltimento dei vecchi infissi, prevista dal catalogo per un intervento di sostituzione.",
    },
    verdettoMessaggio: { esito: "si", testo: "Messaggio coerente, tempistica dichiarata come da richiesta." },
  },
  {
    idTraccia: "demo-3",
    idItemCoda: "demo-item-3",
    richiestaCliente:
      "Pulizia straordinaria di un negozio di 30 mq dopo lavori di ristrutturazione, con urgenza.",
    preventivo: [
      { voce: "Pulizia fine cantiere", quantita: 30, prezzo_unitario: 9, totale: 270 },
      { voce: "Maggiorazione urgenza", quantita: 1, prezzo_unitario: 50, totale: 50 },
    ],
    messaggioCliente:
      "Gentile Cliente, ecco il preventivo per la pulizia straordinaria di fine cantiere (30 mq) con maggiorazione urgenza, per un totale di 320,00 Ã¢â€šÂ¬.",
    documentoUrl: null,
    verdettoPreventivo: { esito: "si", testo: "Voci e maggiorazione corrette secondo catalogo." },
    verdettoMessaggio: {
      esito: "da_rivedere",
      testo: "Il simbolo dell'euro è codificato male nel testo, da correggere prima dell'invio al cliente.",
    },
  },
];

/** Nessuna scrittura reale: cicla sui dati fittizi in memoria, così la demo non finisce mai e
 * nessun visitatore scrive per sbaglio su un progetto Langfuse vero. */
export async function registraGiudizioDemo(giudizio: GiudizioUmano): Promise<ItemDaRivedere | null> {
  const indiceAttuale = datiDemo.findIndex((item) => item.idTraccia === giudizio.idTraccia);
  const prossimo = datiDemo[(indiceAttuale + 1) % datiDemo.length];
  return prossimo;
}
