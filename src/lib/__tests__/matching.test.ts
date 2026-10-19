import { describe, expect, it } from "vitest";
import { ANY_DESTINATION } from "../domain";
import { matchesTrip, newestBy, type AvailabilityLike, type RequestLike } from "../matching";

const date = "2026-11-01";

// Un transportista que va de Montería a Cartagena.
const driver = (o: Partial<AvailabilityLike> = {}): AvailabilityLike => ({
  origin_city: "monteria",
  destination_city: "cartagena",
  service_date: date,
  space: "camion_entero",
  labor: "con_ayudante",
  ...o,
});

// Un cliente que va de Montería a Sincelejo, que queda de camino a Cartagena.
const request = (o: Partial<RequestLike> = {}): RequestLike => ({
  origin_city: "monteria",
  destination_city: "sincelejo",
  service_date: date,
  volume: "medio_camion",
  labor: "yo_cargo",
  ...o,
});

describe("matchesTrip", () => {
  it("atiende cargas sobre el corredor y en el mismo sentido", () => {
    expect(matchesTrip(driver(), request())).toBe(true);
    expect(matchesTrip(driver(), request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe(true);
    // Sentido contrario.
    expect(matchesTrip(driver(), request({ origin_city: "cartagena", destination_city: "monteria" }))).toBe(false);
    // Fuera del corredor.
    expect(matchesTrip(driver(), request({ destination_city: "medellin" }))).toBe(false);
  });

  it("no atiende servicios dentro del mismo municipio, aunque quede en el corredor", () => {
    // Las solicitudes nuevas ya no lo permiten; estas quedaron guardadas de antes.
    expect(matchesTrip(driver(), request({ destination_city: "monteria" }))).toBe(false);
    expect(matchesTrip(driver(), request({ origin_city: "sincelejo", destination_city: "sincelejo" }))).toBe(false);
  });

  it("ya no atiende por cercanía: estar cerca del origen no basta si no va para allá", () => {
    // Cereté queda al lado de Montería, pero Medellín no está de camino a Cartagena.
    expect(matchesTrip(driver(), request({ origin_city: "cerete", destination_city: "medellin" }))).toBe(false);
  });

  it("es un viaje: vale solo ese día", () => {
    // El día siguiente ya no va para allá, ni el anterior.
    expect(matchesTrip(driver(), request({ service_date: "2026-11-02" }))).toBe(false);
    expect(matchesTrip(driver(), request({ service_date: "2026-10-31" }))).toBe(false);
    // Meses después, menos.
    expect(matchesTrip(driver(), request({ service_date: "2027-01-15" }))).toBe(false);
  });

  it("respeta cuánto puede llevar", () => {
    expect(matchesTrip(driver({ space: "solo_paquetes" }), request())).toBe(false);
    expect(matchesTrip(driver({ space: "solo_paquetes" }), request({ volume: "sobres" }))).toBe(true);
    expect(matchesTrip(driver({ space: "carga_parcial" }), request({ volume: "carga_parcial" }))).toBe(true);
    expect(matchesTrip(driver({ space: "carga_parcial" }), request())).toBe(false);
    expect(matchesTrip(driver({ space: "medio_camion" }), request({ volume: "camion_entero" }))).toBe(false);
  });

  it("con cualquier destino atiende a los que salen de su municipio o de uno cercano, vayan a donde vayan", () => {
    const anywhere = driver({ destination_city: ANY_DESTINATION });
    expect(matchesTrip(anywhere, request())).toBe(true);
    expect(matchesTrip(anywhere, request({ destination_city: "medellin" }))).toBe(true);
    // Cereté queda al lado de Montería.
    expect(matchesTrip(anywhere, request({ origin_city: "cerete", destination_city: "medellin" }))).toBe(true);
    // Sincelejo ya queda lejos, aunque vaya para el mismo lado.
    expect(matchesTrip(anywhere, request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe(false);
    // Lo demás se sigue respetando: el día, la carga y el mismo municipio.
    expect(matchesTrip(anywhere, request({ service_date: "2026-11-02" }))).toBe(false);
    expect(matchesTrip(driver({ destination_city: ANY_DESTINATION, space: "solo_paquetes" }), request())).toBe(false);
    expect(matchesTrip(anywhere, request({ destination_city: "monteria" }))).toBe(false);
  });

  it("respeta la mano de obra pedida", () => {
    expect(matchesTrip(driver({ labor: "solo_manejo" }), request({ labor: "conductor" }))).toBe(false);
    expect(matchesTrip(driver({ labor: "yo_ayudo" }), request({ labor: "conductor" }))).toBe(true);
    expect(matchesTrip(driver({ labor: "yo_ayudo" }), request({ labor: "ayudantes" }))).toBe(false);
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

  it("un cliente que buscó dos veces para el mismo viaje sale una vez; otro viaje suyo también sale", () => {
    const trip = (id: string, service_date: string) => ({ id, whatsapp: "573001112233", service_date });
    const rows = [trip("ultima", "2026-11-01"), trip("primera", "2026-11-01"), trip("otro-dia", "2026-11-05")];
    const key = (r: { whatsapp: string; service_date: string }) => `${r.whatsapp}|${r.service_date}`;
    expect(newestBy(rows, key).map((r) => r.id)).toEqual(["ultima", "otro-dia"]);
  });
});
