import { describe, expect, it } from "vitest";
import { ANY_DAY, ROUTE_ERROR } from "../domain";
import { driverInputError, isValidServiceDate, requestInputError } from "../validate";

const today = "2026-10-20";
const driver = {
  origin: "monteria",
  destination: "sincelejo",
  date: today,
  services: ["mudanza", "flete"],
  space: "camion_entero",
  whatsapp: "310 444 5566",
};
const request = {
  origin: "monteria",
  destination: "sincelejo",
  date: today,
  service: "mudanza",
  volume: "medio_camion",
};

describe("driverInputError", () => {
  it("no dice nada si está todo", () => {
    expect(driverInputError(driver, today)).toBeNull();
    expect(driverInputError({ ...driver, destination: "cualquiera" }, today)).toBeNull();
  });

  it("con el formulario vacío pide primero la ruta", () => {
    const empty = { origin: "", destination: "", date: today, services: [], space: "", whatsapp: "" };
    expect(driverInputError(empty, today)).toBe(ROUTE_ERROR);
  });

  it("dice qué falta, en orden", () => {
    expect(driverInputError({ ...driver, destination: "" }, today)).toBe(ROUTE_ERROR);
    expect(driverInputError({ ...driver, destination: "monteria" }, today)).toBe(ROUTE_ERROR);
    expect(driverInputError({ ...driver, services: [] }, today)).toBe("Elija al menos un servicio.");
    expect(driverInputError({ ...driver, services: ["trasteo"] }, today)).toBe("Elija al menos un servicio.");
    expect(driverInputError({ ...driver, space: "" }, today)).toBe("Elija cuánto espacio tiene.");
    expect(driverInputError({ ...driver, whatsapp: "300 12" }, today)).toBe("Escriba su número de 10 dígitos.");
  });

  it("el espacio solo se pregunta si hace mudanzas, con las dos opciones de la mudanza", () => {
    expect(driverInputError({ ...driver, space: "carga_parcial" }, today)).toBe("Elija cuánto espacio tiene.");
    expect(driverInputError({ ...driver, services: ["flete", "encargo"], space: "" }, today)).toBeNull();
  });
});

describe("requestInputError", () => {
  it("no dice nada si está todo", () => {
    expect(requestInputError(request, today)).toBeNull();
  });

  it("dice qué falta, en orden", () => {
    expect(requestInputError({ ...request, service: "" }, today)).toBe("Elija qué servicio necesita.");
    expect(requestInputError({ ...request, volume: "" }, today)).toBe("Elija qué tan grande es.");
    expect(requestInputError({ ...request, origin: "" }, today)).toBe(ROUTE_ERROR);
    expect(requestInputError({ ...request, destination: "" }, today)).toBe(ROUTE_ERROR);
    expect(requestInputError({ ...request, destination: "monteria" }, today)).toBe(ROUTE_ERROR);
  });

  it("solo la mudanza pregunta qué tan grande", () => {
    // "¿Qué tan grande?" tiene dos opciones: una habitación o una casa.
    expect(requestInputError({ ...request, volume: "carga_parcial" }, today)).toBe("Elija qué tan grande es.");
    for (const service of ["flete", "encomienda", "encargo", "diligencia"]) {
      expect(requestInputError({ ...request, service, volume: "" }, today)).toBeNull();
    }
  });

  it("el cliente puede dejar cualquier día; el transportista no", () => {
    expect(requestInputError({ ...request, date: ANY_DAY }, today)).toBeNull();
    expect(driverInputError({ ...driver, date: ANY_DAY }, today)).toBe("Elija un día de hoy en adelante.");
  });

  it("el cliente no puede pedir cualquier destino", () => {
    expect(requestInputError({ ...request, destination: "cualquiera" }, today)).toBe(ROUTE_ERROR);
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
