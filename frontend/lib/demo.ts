import type { GiudizioUmano, ItemDaRivedere, VoceCatalogo } from "./tipi";

/** Dati per far provare l'interfaccia senza credenziali Langfuse (usati quando
 * `LANGFUSE_HOST`/`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` non sono configurate — vedi
 * `app/page.tsx`). Sono quattro output reali della pipeline (lotto 2026-09-29, esecutore e giudice
 * automatico), con i PDF in `public/demo/`; nessun segreto, modulo sicuro da importare anche lato
 * client. */
export const catalogoDemo: VoceCatalogo[] = [
  {
    "voce": "Pittura lavabile bianca (mano 1+2)",
    "unita": "mq",
    "prezzo_unitario": 12.0
  },
  {
    "voce": "Stuccatura e rasatura pareti",
    "unita": "mq",
    "prezzo_unitario": 4.0
  },
  {
    "voce": "Protezione pavimenti e mobili",
    "unita": "una tantum",
    "prezzo_unitario": 80.0
  },
  {
    "voce": "Finestra doppio vetro 120x150",
    "unita": "cad.",
    "prezzo_unitario": 450.0
  },
  {
    "voce": "Smontaggio e smaltimento vecchi infissi",
    "unita": "cad.",
    "prezzo_unitario": 60.0
  },
  {
    "voce": "Posa in opera infissi",
    "unita": "cad.",
    "prezzo_unitario": 70.0
  },
  {
    "voce": "Pulizia fine cantiere",
    "unita": "mq",
    "prezzo_unitario": 9.0
  },
  {
    "voce": "Maggiorazione weekend",
    "unita": "una tantum",
    "prezzo_unitario": 50.0
  }
];

export const datiDemo: ItemDaRivedere[] = [
  {
    "idTraccia": "demo-1",
    "idItemCoda": "demo-item-1",
    "richiestaCliente": "Vorrei tinteggiare pareti e soffitto di un appartamento di 80 mq, due mani di pittura lavabile bianca, disponibilità entro fine mese.",
    "preventivo": [
      {
        "voce": "Pittura lavabile bianca (mano 1+2)",
        "quantita": 80,
        "prezzo_unitario": 12,
        "totale": 960
      },
      {
        "voce": "Protezione pavimenti e mobili",
        "quantita": 1,
        "prezzo_unitario": 80,
        "totale": 80
      }
    ],
    "messaggioCliente": "Gentile Cliente,\n\nla ringraziamo per averci contattato per la tinteggiatura del Suo appartamento di 80 mq.\n\nIn base a quanto richiesto, le proponiamo un preventivo che comprende l'applicazione di pittura lavabile bianca a due mani su pareti e soffitto, oltre alla protezione di pavimenti e arredi durante i lavori.\n\nSiamo lieti di confermarLe la nostra disponibilità a intervenire entro la fine del mese, come da Sua richiesta. In allegato trova il dettaglio economico del preventivo.\n\nRestiamo a disposizione per qualsiasi chiarimento e per concordare la data di intervento più adatta alle Sue esigenze.\n\nCordiali saluti,\nUfficio Commerciale",
    "documentoUrl": "/demo/tinteggiatura-80mq.pdf",
    "verdettoPreventivo": {
      "esito": "da_rivedere",
      "testo": "La quantità usata (80 mq) coincide con la superficie dell'appartamento, ma la richiesta è tinteggiare pareti E soffitto: la superficie effettiva da verniciare è tipicamente 2-3 volte quella calpestabile. Il preventivo rischia quindi di sottostimare i mq reali di pittura da applicare."
    },
    "verdettoMessaggio": {
      "esito": "si",
      "testo": "Tono professionale e corretto riferimento alla richiesta (pareti e soffitto, due mani, disponibilità entro fine mese) e al contenuto del preventivo, senza maggiorazioni da segnalare."
    }
  },
  {
    "idTraccia": "demo-2",
    "idItemCoda": "demo-item-2",
    "richiestaCliente": "Vorrei anche rifare l'impianto elettrico di una cucina di 12 mq e tinteggiarla di bianco lavabile.",
    "preventivo": [
      {
        "voce": "Protezione pavimenti e mobili",
        "quantita": 1,
        "prezzo_unitario": 80,
        "totale": 80
      },
      {
        "voce": "Stuccatura e rasatura pareti",
        "quantita": 12,
        "prezzo_unitario": 4,
        "totale": 48
      },
      {
        "voce": "Pittura lavabile bianca (mano 1+2)",
        "quantita": 12,
        "prezzo_unitario": 12,
        "totale": 144
      },
      {
        "voce": "Pulizia fine cantiere",
        "quantita": 12,
        "prezzo_unitario": 9,
        "totale": 108
      }
    ],
    "messaggioCliente": "Gentile Cliente,\n\nla ringraziamo per averci contattato. In merito alla Sua richiesta per la cucina di 12 mq, siamo lieti di sottoporLe il preventivo per la tinteggiatura con pittura lavabile bianca, comprensivo di stuccatura e rasatura delle pareti, protezione di pavimenti e mobili e pulizia di fine cantiere.\n\nLa informiamo che il rifacimento dell'impianto elettrico non rientra tra i servizi da noi offerti: Le consigliamo pertanto di rivolgersi a una ditta specializzata in impiantistica elettrica per quella parte dei lavori. Restiamo naturalmente a disposizione per coordinarci con l'elettricista scelto, ad esempio programmando la tinteggiatura successivamente ai lavori elettrici.\n\nIn allegato trova il dettaglio economico della nostra proposta. Restiamo a disposizione per qualsiasi chiarimento o per fissare un sopralluogo.\n\nCordiali saluti,\nUfficio Commerciale",
    "documentoUrl": "/demo/cucina-impianto-elettrico.pdf",
    "verdettoPreventivo": {
      "esito": "si",
      "testo": "Le voci relative alla tinteggiatura (protezione, stuccatura, pittura, pulizia) sono coerenti con il catalogo, le quantità (12 mq) e i prezzi unitari sono corretti nei calcoli. L'impianto elettrico è correttamente escluso poiché non presente a catalogo."
    },
    "verdettoMessaggio": {
      "esito": "si",
      "testo": "Tono professionale e cortese, riepiloga correttamente i servizi inclusi nel preventivo e spiega chiaramente l'esclusione dell'impianto elettrico, offrendo anche disponibilità a coordinarsi con l'elettricista."
    }
  },
  {
    "idTraccia": "demo-3",
    "idItemCoda": "demo-item-3",
    "richiestaCliente": "Preventivo per la sostituzione di 6 finestre in un appartamento, doppio vetro, entro 3 settimane.",
    "preventivo": [
      {
        "voce": "Finestra doppio vetro 120x150",
        "quantita": 6,
        "prezzo_unitario": 450,
        "totale": 2700
      },
      {
        "voce": "Smontaggio e smaltimento vecchi infissi",
        "quantita": 6,
        "prezzo_unitario": 60,
        "totale": 360
      },
      {
        "voce": "Posa in opera infissi",
        "quantita": 6,
        "prezzo_unitario": 70,
        "totale": 420
      }
    ],
    "messaggioCliente": "Gentile Cliente,\n\nla ringraziamo per averci contattato per la sostituzione delle 6 finestre del Suo appartamento con infissi a doppio vetro (120x150 cm).\n\nDi seguito il dettaglio del preventivo:\n- Fornitura di n. 6 finestre doppio vetro 120x150: € 2.700,00\n- Smontaggio e smaltimento dei vecchi infissi (6 pezzi): € 360,00\n- Posa in opera dei nuovi infissi (6 pezzi): € 420,00\n\nTotale complessivo: € 3.480,00 (IVA esclusa)\n\nConfermiamo la possibilità di completare l'intervento entro 3 settimane dalla conferma dell'ordine, come da Sua richiesta.\n\nRestiamo a disposizione per qualsiasi chiarimento e per concordare la data di inizio lavori.\n\nCordiali saluti,\nL'Ufficio Commerciale",
    "documentoUrl": "/demo/sei-finestre.pdf",
    "verdettoPreventivo": {
      "esito": "si",
      "testo": "Le voci utilizzate (finestra, smontaggio, posa) sono tutte presenti a catalogo con prezzi unitari corretti (450, 60, 70) e quantità coerenti con le 6 finestre richieste; i totali sono calcolati correttamente. Non sono richieste maggiorazioni essendo un intervento nei giorni feriali, e le voci pittura/rasatura/pulizia cantiere non sono pertinenti a un intervento di sola sostituzione infissi."
    },
    "verdettoMessaggio": {
      "esito": "si",
      "testo": "Tono professionale e cortese, dettaglio voci e totale coerenti col preventivo, conferma corretta dei tempi (3 settimane) richiesti dal cliente; nessuna maggiorazione da segnalare essendo assente nel preventivo."
    }
  },
  {
    "idTraccia": "demo-4",
    "idItemCoda": "demo-item-4",
    "richiestaCliente": "Devo ridipingere una camera da letto di 16 mq, pareti già in buone condizioni, pittura bianca lavabile. Va bene anche a metà mese prossimo.",
    "preventivo": [
      {
        "voce": "Pittura lavabile bianca (mano 1+2)",
        "quantita": 16,
        "prezzo_unitario": 12,
        "totale": 192
      },
      {
        "voce": "Protezione pavimenti e mobili",
        "quantita": 1,
        "prezzo_unitario": 80,
        "totale": 80
      },
      {
        "voce": "Pulizia fine cantiere",
        "quantita": 16,
        "prezzo_unitario": 9,
        "totale": 144
      }
    ],
    "messaggioCliente": "Gentile Cliente,\n\nla ringraziamo per averci contattato per la tinteggiatura della Sua camera da letto di 16 mq.\n\nPoiché le pareti sono già in buone condizioni, non prevediamo interventi di stuccatura o rasatura: procederemo direttamente con l'applicazione di pittura lavabile bianca a due mani (fondo + finitura), oltre alla protezione di pavimenti e mobili durante i lavori e alla pulizia finale del cantiere.\n\nDi seguito il preventivo di dettaglio:\n- Pittura lavabile bianca (mano 1+2), 16 mq: € 192,00\n- Protezione pavimenti e mobili: € 80,00\n- Pulizia fine cantiere, 16 mq: € 144,00\n\nTotale complessivo: € 416,00\n\nPer quanto riguarda la tempistica, ci risulta che sia disponibile anche a metà del prossimo mese: siamo lieti di poterci organizzare in tal senso e Le proporremo alcune date compatibili con il nostro calendario.\n\nRestiamo a disposizione per qualsiasi chiarimento e per confermare l'intervento.\n\nCordiali saluti,\nUfficio Commerciale",
    "documentoUrl": "/demo/camera-16mq.pdf",
    "verdettoPreventivo": {
      "esito": "da_rivedere",
      "testo": "Pittura (192€) e protezione pavimenti/mobili (80€) sono coerenti con la richiesta; corretto omettere la stuccatura essendo le pareti già in buone condizioni. La 'Pulizia fine cantiere' da 144€ (16 mq) appare però sproporzionata per una semplice ritinteggiatura senza demolizioni/infissi: è una voce tipica di cantieri più invasivi e qui supera quasi il costo della pittura stessa. Andrebbe verificata l'effettiva necessità o ridotta la quantità/voce applicata."
    },
    "verdettoMessaggio": {
      "esito": "si",
      "testo": "Tono professionale e cortese, riepiloga correttamente le voci e i totali del preventivo, spiega in modo chiaro perché non è prevista la stuccatura, e fa riferimento appropriato alla disponibilità del cliente per metà del mese prossimo senza applicare maggiorazioni non richieste."
    }
  }
];

/** Nessuna scrittura reale: cicla sui dati della demo, così non finisce mai e nessun visitatore
 * scrive per sbaglio su un progetto Langfuse vero. */
export async function registraGiudizioDemo(giudizio: GiudizioUmano): Promise<ItemDaRivedere | null> {
  const indiceAttuale = datiDemo.findIndex((item) => item.idTraccia === giudizio.idTraccia);
  const prossimo = datiDemo[(indiceAttuale + 1) % datiDemo.length];
  return prossimo;
}
