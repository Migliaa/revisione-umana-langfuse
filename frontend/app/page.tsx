import { ItemDaRivedereView } from "@/components/ItemDaRivedereView";
import { TutorialPopup } from "@/components/TutorialPopup";
import { registraGiudizioDemo, registraGiudizioUmano } from "@/lib/azioni";
import { caricaCatalogo } from "@/lib/catalogo";
import { catalogoDemo, datiDemo } from "@/lib/demo";
import { caricaProssimoItemDaRivedere } from "@/lib/langfuse";

/** Senza credenziali Langfuse configurate l'interfaccia mostra dati fittizi invece di un errore
 * di configurazione — così chi clona il repo (o prova la demo pubblicata) può usare lo strumento
 * subito, senza dover prima creare un progetto Langfuse. */
function modalitaDemoAttiva(): boolean {
  return !process.env.LANGFUSE_HOST || !process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY;
}

export default async function Pagina() {
  if (modalitaDemoAttiva()) {
    return (
      <main>
        <TutorialPopup demo />
        <p className="banner-demo">
          Modalità demo — richieste inventate, output reali della pipeline.{" "}
          <a href="https://github.com/Migliaa/revisione-umana-langfuse">Codice su GitHub</a>
        </p>
        <ItemDaRivedereView item={datiDemo[0]} catalogo={catalogoDemo} registraGiudizio={registraGiudizioDemo} />
      </main>
    );
  }

  const [item, catalogo] = await Promise.all([caricaProssimoItemDaRivedere(), caricaCatalogo()]);

  if (!item) {
    return (
      <main className="stato-vuoto">
        <TutorialPopup demo={false} />
        <p>Nessun preventivo da rivedere al momento.</p>
      </main>
    );
  }

  return (
    <main>
      <TutorialPopup demo={false} />
      <ItemDaRivedereView item={item} catalogo={catalogo} registraGiudizio={registraGiudizioUmano} />
    </main>
  );
}
