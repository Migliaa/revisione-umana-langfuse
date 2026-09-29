"use server";

import { registraGiudizioDemo as registraGiudizioDemoInterno } from "./demo";
import { registraGiudizioUmano as registraGiudizioUmanoInterno } from "./langfuse";
import type { GiudizioUmano, ItemDaRivedere } from "./tipi";

export async function registraGiudizioUmano(giudizio: GiudizioUmano): Promise<ItemDaRivedere | null> {
  return registraGiudizioUmanoInterno(giudizio);
}

export async function registraGiudizioDemo(giudizio: GiudizioUmano): Promise<ItemDaRivedere | null> {
  return registraGiudizioDemoInterno(giudizio);
}
