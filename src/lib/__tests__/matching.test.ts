import { describe, expect, it } from "vitest";
import { matchKind, type AvailabilityLike, type RequestLike } from "../matching";

const date = "2026-11-01";

const driver = (o: Partial<AvailabilityLike> = {}): AvailabilityLike => ({
  origin_city: "monteria",
  destination_city: null,
  service_date: date,
  space: "camion_entero",
  labor: "con_ayudante",
  ...o,
});

const request = (o: Partial<RequestLike> = {}): RequestLike => ({
  origin_city: "monteria",
  destination_city: "monteria",
  service_date: date,
  volume: "medio_camion",
  labor: "yo_cargo",
  ...o,
});

describe("matchKind", () => {
  it("modo disponible: atiende salidas desde su ciudad y alrededores", () => {
    expect(matchKind(driver(), request())).toBe("local");
    expect(matchKind(driver(), request({ origin_city: "cerete", destination_city: "medellin" }))).toBe("local");
    expect(matchKind(driver(), request({ origin_city: "cartagena" }))).toBeNull();
  });

  it("modo ruta: atiende cargas sobre el corredor y en el mismo sentido", () => {
    const d = driver({ destination_city: "cartagena" });
    // Montería → Sincelejo queda de camino a Cartagena.
    expect(matchKind(d, request({ destination_city: "sincelejo" }))).toBe("ruta");
    expect(matchKind(d, request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe("ruta");
    // Sentido contrario.
    expect(matchKind(d, request({ origin_city: "cartagena", destination_city: "monteria" }))).toBeNull();
    // Fuera del corredor.
    expect(matchKind(d, request({ destination_city: "medellin" }))).toBeNull();
  });

  it("respeta la fecha", () => {
    expect(matchKind(driver(), request({ service_date: "2026-11-02" }))).toBeNull();
  });

  it("respeta el espacio disponible", () => {
    expect(matchKind(driver({ space: "baul" }), request())).toBeNull();
    expect(matchKind(driver({ space: "baul" }), request({ volume: "sobres" }))).toBe("local");
    expect(matchKind(driver({ space: "medio_camion" }), request({ volume: "camion_entero" }))).toBeNull();
  });

  it("respeta la mano de obra pedida", () => {
    expect(matchKind(driver({ labor: "solo_manejo" }), request({ labor: "conductor" }))).toBeNull();
    expect(matchKind(driver({ labor: "yo_ayudo" }), request({ labor: "conductor" }))).toBe("local");
    expect(matchKind(driver({ labor: "yo_ayudo" }), request({ labor: "ayudantes" }))).toBeNull();
  });
});
