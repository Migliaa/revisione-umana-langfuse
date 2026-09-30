import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach } from "vitest";

import { TutorialPopup } from "../components/TutorialPopup";
import { datiDemo, registraGiudizioDemo } from "../lib/demo";
import Pagina from "../app/page";

describe("dati e ciclo demo", () => {
  it("cicla al prossimo item demo e torna al primo dopo l'ultimo", async () => {
    const secondo = await registraGiudizioDemo({
      idTraccia: datiDemo[0].idTraccia,
      idItemCoda: datiDemo[0].idItemCoda,
      esitoPreventivo: "si",
      commentoPreventivo: "",
      accordoPreventivo: true,
      esitoMessaggio: "si",
      commentoMessaggio: "",
      accordoMessaggio: true,
      messaggioClienteCorretto: datiDemo[0].messaggioCliente,
    });
    expect(secondo?.idTraccia).toBe(datiDemo[1].idTraccia);

    const primoDiNuovo = await registraGiudizioDemo({
      idTraccia: datiDemo[datiDemo.length - 1].idTraccia,
      idItemCoda: datiDemo[datiDemo.length - 1].idItemCoda,
      esitoPreventivo: "si",
      commentoPreventivo: "",
      accordoPreventivo: true,
      esitoMessaggio: "si",
      commentoMessaggio: "",
      accordoMessaggio: true,
      messaggioClienteCorretto: "",
    });
    expect(primoDiNuovo?.idTraccia).toBe(datiDemo[0].idTraccia);
  });
});

describe("modalità demo della pagina", () => {
  const originali = {
    host: process.env.LANGFUSE_HOST,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
  };

  beforeEach(() => {
    delete process.env.LANGFUSE_HOST;
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
  });

  afterEach(() => {
    if (originali.host) process.env.LANGFUSE_HOST = originali.host;
    if (originali.publicKey) process.env.LANGFUSE_PUBLIC_KEY = originali.publicKey;
    if (originali.secretKey) process.env.LANGFUSE_SECRET_KEY = originali.secretKey;
  });

  it("senza credenziali Langfuse mostra il banner demo e il primo item fittizio", async () => {
    render(await Pagina());

    expect(screen.getByText(/Modalità demo/)).toBeInTheDocument();
    expect(screen.getByText(datiDemo[0].richiestaCliente)).toBeInTheDocument();
  });
});

describe("TutorialPopup", () => {
  it("mostra la spiegazione e si chiude al click su 'Ho capito'", () => {
    render(<TutorialPopup demo={false} />);

    expect(screen.getByText(/Come funziona dietro le quinte/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ho capito" }));
    expect(screen.queryByText(/Come funziona dietro le quinte/)).not.toBeInTheDocument();
  });

  it("in modalità demo mostra anche la nota sui dati fittizi", () => {
    render(<TutorialPopup demo />);
    expect(screen.getByText(/dati fittizi/)).toBeInTheDocument();
  });
});
