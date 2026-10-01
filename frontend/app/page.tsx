import { ItemDaRivedereView } from "@/components/ItemDaRivedereView";
import { TutorialPopup } from "@/components/TutorialPopup";
import { registraGiudizioDemo, registraGiudizioUmano, risolviUrlDocumento } from "@/lib/azioni";
import { caricaCatalogo } from "@/lib/catalogo";
import { catalogoDemo, datiDemo } from "@/lib/demo";
import { caricaItemDaRivedere } from "@/lib/langfuse";

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
          <a href="https://github.com/Migliaa/revisione-umana-langfuse">Codice su GitHub</a> · <a href="https://cloud.langfuse.com/project/cmu1agdkj00syad0dyas2site/traces/75428e75cb28dd0ff4011fa028ea2e39">Esempio su Langfuse</a>
        </p>
        <ItemDaRivedereView items={datiDemo} catalogo={catalogoDemo} registraGiudizio={registraGiudizioDemo} />
      </main>
    );
  }

  const [items, catalogo] = await Promise.all([caricaItemDaRivedere(), caricaCatalogo()]);

  if (items.length === 0) {
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
      <ItemDaRivedereView items={items} catalogo={catalogo} registraGiudizio={registraGiudizioUmano} risolviUrlDocumento={risolviUrlDocumento} />
    </main>
  );
}
