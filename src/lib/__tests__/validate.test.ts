import { describe, expect, it } from "vitest";
import { SAME_CITY_ERROR } from "../domain";
import { driverInputError, isValidServiceDate, requestInputError } from "../validate";

const today = "2026-10-20";
const driver = {
  origin: "monteria",
  destination: "sincelejo",
  date: today,
  space: "camion_entero",
  labor: "yo_ayudo",
  whatsapp: "310 444 5566",
};
const request = {
  origin: "monteria",
  destination: "sincelejo",
  date: today,
  volume: "medio_camion",
  labor: "conductor",
  whatsapp: "300 111 2233",
};

describe("driverInputError", () => {
  it("no dice nada si está todo", () => {
    expect(driverInputError(driver, today)).toBeNull();
    expect(driverInputError({ ...driver, destination: "cualquiera" }, today)).toBeNull();
  });

  it("con el formulario vacío pide primero dónde está", () => {
    const empty = { origin: "", destination: "", date: today, space: "", labor: "", whatsapp: "" };
    expect(driverInputError(empty, today)).toBe("Elige la ciudad donde estás.");
  });

  it("dice qué falta, en orden", () => {
    expect(driverInputError({ ...driver, destination: "" }, today)).toBe("Elige hacia dónde vas.");
    expect(driverInputError({ ...driver, destination: "monteria" }, today)).toBe(SAME_CITY_ERROR);
    expect(driverInputError({ ...driver, space: "" }, today)).toBe("Elige cuánto puedes llevar.");
    expect(driverInputError({ ...driver, labor: "" }, today)).toBe("Elige si ayudas a cargar.");
    expect(driverInputError({ ...driver, whatsapp: "300 12" }, today)).toBe("Revisa el número de teléfono.");
  });
});

describe("requestInputError", () => {
  it("no dice nada si está todo", () => {
    expect(requestInputError(request, today)).toBeNull();
  });

  it("dice qué falta, en orden", () => {
    expect(requestInputError({ ...request, origin: "" }, today)).toBe("Elige desde dónde.");
    expect(requestInputError({ ...request, destination: "" }, today)).toBe("Elige hacia dónde.");
    expect(requestInputError({ ...request, destination: "monteria" }, today)).toBe(SAME_CITY_ERROR);
    expect(requestInputError({ ...request, volume: "" }, today)).toBe("Elige qué vas a mover.");
    expect(requestInputError({ ...request, labor: "" }, today)).toBe("Elige si necesitas ayuda para cargar.");
    expect(requestInputError({ ...request, whatsapp: "" }, today)).toBe("Revisa el número de teléfono.");
  });

  it("el cliente no puede pedir cualquier destino", () => {
    expect(requestInputError({ ...request, destination: "cualquiera" }, today)).toBe("Elige hacia dónde.");
  });
});

describe("isValidServiceDate", () => {
  it("acepta de hoy a 90 días", () => {
    expect(isValidServiceDate(today, today)).toBe(true);
    expect(isValidServiceDate("2027-01-18", today)).toBe(true);
    expect(isValidServiceDate("2027-01-19", today)).toBe(false);
    expect(isValidServiceDate("2026-10-19", today)).toBe(false);
    expect(isValidServiceDate("", today)).toBe(false);
  });
});
