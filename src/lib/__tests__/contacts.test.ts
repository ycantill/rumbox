import { describe, expect, it } from "vitest";
import { isContactAnswer, loadSummary, phoneEnding } from "../contacts";

describe("phoneEnding", () => {
  it("deja solo los dos últimos números", () => {
    expect(phoneEnding("573001234545")).toBe("45");
    expect(phoneEnding("+57 300 123 4567")).toBe("67");
  });

  it("no muestra nada si el teléfono ya se borró", () => {
    expect(phoneEnding(null)).toBeNull();
    expect(phoneEnding("")).toBeNull();
    expect(phoneEnding("5")).toBeNull();
  });
});

describe("loadSummary", () => {
  it("dice qué va a mover y la ayuda que pide", () => {
    expect(loadSummary("carga_parcial", "yo_cargo")).toBe("Algunas cosas · El cliente carga");
    expect(loadSummary("camion_entero", "ayudantes")).toBe(
      "Una casa de 2 habitaciones o más · Necesita ayudantes extra para cargar",
    );
  });

  it("con paquetes o sobres no habla de la ayuda para cargar", () => {
    expect(loadSummary("sobres", "yo_cargo")).toBe("Paquetes o sobres");
  });
});

describe("isContactAnswer", () => {
  it("solo acepta lo llevo o no lo llevo", () => {
    expect(isContactAnswer("lo_llevo")).toBe(true);
    expect(isContactAnswer("no_lo_llevo")).toBe(true);
    expect(isContactAnswer("otra")).toBe(false);
    expect(isContactAnswer(null)).toBe(false);
  });
});
