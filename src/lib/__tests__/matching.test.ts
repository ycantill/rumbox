import { describe, expect, it } from "vitest";
import { matchKind, newestBy, type AvailabilityLike, type RequestLike } from "../matching";

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

  it("sin destino trabaja desde su fecha en adelante", () => {
    expect(matchKind(driver(), request({ service_date: "2026-11-02" }))).toBe("local");
    expect(matchKind(driver(), request({ service_date: "2026-10-31" }))).toBeNull();
  });

  it("con destino es un viaje: vale solo ese día", () => {
    const d = driver({ destination_city: "cartagena" });
    const trip = request({ destination_city: "sincelejo" });
    expect(matchKind(d, trip)).toBe("ruta");
    // El día siguiente ya no va para allá, ni el anterior.
    expect(matchKind(d, { ...trip, service_date: "2026-11-02" })).toBeNull();
    expect(matchKind(d, { ...trip, service_date: "2026-10-31" })).toBeNull();
    // Meses después, menos.
    expect(matchKind(d, { ...trip, service_date: "2027-01-15" })).toBeNull();
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

describe("newestBy", () => {
  it("un transportista que quedó dos veces sale una sola, con lo último que guardó", () => {
    // Llegan de la más nueva a la más vieja, como en la consulta.
    const rows = [
      { id: "nueva", whatsapp: "573001112233" },
      { id: "otro", whatsapp: "573004445566" },
      { id: "vieja", whatsapp: "573001112233" },
    ];
    expect(newestBy(rows, (r) => r.whatsapp).map((r) => r.id)).toEqual(["nueva", "otro"]);
  });

  it("un cliente que pidió precio dos veces para el mismo viaje sale una vez; otro viaje suyo también sale", () => {
    const trip = (id: string, service_date: string) => ({ id, whatsapp: "573001112233", service_date });
    const rows = [trip("ultima", "2026-11-01"), trip("primera", "2026-11-01"), trip("otro-dia", "2026-11-05")];
    const key = (r: { whatsapp: string; service_date: string }) => `${r.whatsapp}|${r.service_date}`;
    expect(newestBy(rows, key).map((r) => r.id)).toEqual(["ultima", "otro-dia"]);
  });
});
