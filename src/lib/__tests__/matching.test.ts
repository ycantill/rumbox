import { describe, expect, it } from "vitest";
import { matchKind, type AvailabilityLike, type RequestLike } from "../matching";

const date = "2026-11-01";

const driver = (o: Partial<AvailabilityLike> = {}): AvailabilityLike => ({
  origin_city: "monteria",
  destination_city: null,
  coverage: "nacional",
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
  it("nacional: atiende salidas desde su zona hacia cualquier ciudad", () => {
    expect(matchKind(driver(), request())).toBe("zona");
    expect(matchKind(driver(), request({ origin_city: "cerete", destination_city: "medellin" }))).toBe("zona");
    expect(matchKind(driver(), request({ origin_city: "cartagena" }))).toBeNull();
  });

  it("local: solo servicios que empiezan y terminan en su zona", () => {
    const d = driver({ coverage: "local" });
    expect(matchKind(d, request())).toBe("zona");
    expect(matchKind(d, request({ origin_city: "cerete" }))).toBe("zona");
    expect(matchKind(d, request({ destination_city: "medellin" }))).toBeNull();
  });

  it("el destino no cambia el alcance: con ruta sigue atendiendo su zona", () => {
    const local = driver({ coverage: "local", destination_city: "cartagena" });
    // Cereté → Montería va en sentido contrario a la ruta, pero está en su zona.
    expect(matchKind(local, request({ origin_city: "cerete" }))).toBe("zona");
    expect(matchKind(local, request({ destination_city: "medellin" }))).toBeNull();
    const nacional = driver({ destination_city: "cartagena" });
    expect(matchKind(nacional, request({ destination_city: "medellin" }))).toBe("zona");
  });

  it("modo ruta: atiende cargas sobre el corredor y en el mismo sentido", () => {
    // Con alcance local para comprobar que el corredor no depende del alcance.
    const d = driver({ coverage: "local", destination_city: "cartagena" });
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
    expect(matchKind(driver({ space: "baul" }), request({ volume: "sobres" }))).toBe("zona");
    expect(matchKind(driver({ space: "medio_camion" }), request({ volume: "camion_entero" }))).toBeNull();
  });

  it("respeta la mano de obra pedida", () => {
    expect(matchKind(driver({ labor: "solo_manejo" }), request({ labor: "conductor" }))).toBeNull();
    expect(matchKind(driver({ labor: "yo_ayudo" }), request({ labor: "conductor" }))).toBe("zona");
    expect(matchKind(driver({ labor: "yo_ayudo" }), request({ labor: "ayudantes" }))).toBeNull();
  });
});
