import { describe, expect, it } from "vitest";
import { activeScreen, requestIsOpen, tripIsOn } from "../one-at-a-time";

const today = "2026-10-20";
const trip = { destination: "sincelejo", date: today, space: "camion_entero" };

describe("tripIsOn", () => {
  it("no se vence aunque ya haya pasado su día", () => {
    expect(tripIsOn(trip)).toBe(true);
    expect(tripIsOn({ ...trip, date: "2026-10-01" } as typeof trip)).toBe(true);
  });

  it("con cualquier destino también vale", () => {
    expect(tripIsOn({ ...trip, destination: "cualquiera" })).toBe(true);
  });

  it("lo guardado de antes, sin destino o en carro particular, ya no vale", () => {
    expect(tripIsOn({ ...trip, destination: null })).toBe(false);
    expect(tripIsOn({ ...trip, space: "baul" })).toBe(false);
  });
});

describe("requestIsOpen", () => {
  it("vale hasta que termina el día del viaje", () => {
    expect(requestIsOpen({ date: "2026-10-22" }, today)).toBe(true);
    expect(requestIsOpen({ date: today }, today)).toBe(true);
    expect(requestIsOpen({ date: "2026-10-19" }, today)).toBe(false);
  });
});

describe("activeScreen", () => {
  it("va a lo que el teléfono tiene abierto", () => {
    expect(activeScreen({ request: { date: today }, trip: undefined }, today)).toBe("/solicitar");
    expect(activeScreen({ request: null, trip }, today)).toBe("/transportista");
  });

  it("sin nada abierto, o ya vencido, se queda en el inicio", () => {
    expect(activeScreen({ request: null, trip: undefined }, today)).toBeNull();
    expect(activeScreen({ request: { date: "2026-10-18" }, trip: undefined }, today)).toBeNull();
    expect(activeScreen({ request: null, trip: { ...trip, destination: null } }, today)).toBeNull();
  });
});
