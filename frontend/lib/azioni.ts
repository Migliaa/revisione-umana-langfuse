"use server";

import { registraGiudizioDemo as registraGiudizioDemoInterno } from "./demo";
import { registraGiudizioUmano as registraGiudizioUmanoInterno, risolviUrlDocumento as risolviUrlDocumentoInterno } from "./langfuse";
import type { GiudizioUmano } from "./tipi";

export async function registraGiudizioUmano(giudizio: GiudizioUmano): Promise<void> {
  return registraGiudizioUmanoInterno(giudizio);
}

export async function registraGiudizioDemo(giudizio: GiudizioUmano): Promise<void> {
  return registraGiudizioDemoInterno(giudizio);
}

export async function risolviUrlDocumento(idMedia: string): Promise<string> {
  return risolviUrlDocumentoInterno(idMedia);
}
