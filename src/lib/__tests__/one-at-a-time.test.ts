import { describe, expect, it } from "vitest";
import { requestIsOpen, tripIsOn } from "../one-at-a-time";

const today = "2026-10-20";
const trip = { destination: "sincelejo", date: today, space: "camion_entero" };

describe("tripIsOn", () => {
  it("vale el día del viaje y 24 horas más", () => {
    expect(tripIsOn(trip, today)).toBe(true);
    expect(tripIsOn({ ...trip, date: "2026-10-19" }, today)).toBe(true);
    expect(tripIsOn({ ...trip, date: "2026-10-18" }, today)).toBe(false);
  });

  it("con cualquier destino también vale", () => {
    expect(tripIsOn({ ...trip, destination: "cualquiera" }, today)).toBe(true);
  });

  it("lo guardado de antes, sin destino o en carro particular, ya no vale", () => {
    expect(tripIsOn({ ...trip, destination: null }, today)).toBe(false);
    expect(tripIsOn({ ...trip, space: "baul" }, today)).toBe(false);
  });
});

describe("requestIsOpen", () => {
  it("vale el día del viaje y 24 horas más", () => {
    expect(requestIsOpen({ date: "2026-10-22" }, today)).toBe(true);
    expect(requestIsOpen({ date: "2026-10-19" }, today)).toBe(true);
    expect(requestIsOpen({ date: "2026-10-18" }, today)).toBe(false);
  });
});
