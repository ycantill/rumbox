import { describe, expect, it } from "vitest";
import { decodePath, encodePath, pathKm, projectOnPath, simplifyPath } from "../path";
import { BOGOTA_BARRANQUILLA } from "./road-fixture";

describe("encodePath y decodePath", () => {
  it("usan el formato de Google", () => {
    const points = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    expect(encodePath(points)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(decodePath("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual(points);
  });

  it("guardan y devuelven los mismos puntos, con 5 decimales", () => {
    const back = decodePath(encodePath(BOGOTA_BARRANQUILLA));
    expect(back).toHaveLength(BOGOTA_BARRANQUILLA.length);
    back.forEach((p, i) => {
      expect(p.lat).toBeCloseTo(BOGOTA_BARRANQUILLA[i].lat, 5);
      expect(p.lng).toBeCloseTo(BOGOTA_BARRANQUILLA[i].lng, 5);
    });
  });

  it("un texto vacío o dañado no da puntos", () => {
    expect(decodePath(null)).toEqual([]);
    expect(decodePath("")).toEqual([]);
    expect(decodePath("_p~iF~ps|U_")).toEqual([]);
    expect(decodePath("hola mundo")).toEqual([]);
  });
});

describe("simplifyPath", () => {
  it("quita los puntos que casi no cambian la forma y deja las puntas", () => {
    // Una recta con muchos puntos y una curva en el medio.
    const line = Array.from({ length: 101 }, (_, i) => ({ lat: 4 + i * 0.01, lng: -74 + (i === 50 ? 0.2 : 0) }));
    const simple = simplifyPath(line, 0.5);
    expect(simple).toEqual([line[0], line[49], line[50], line[51], line[100]]);
  });
});

describe("projectOnPath", () => {
  it("dice cuántos km de ruta lleva y qué tan lejos queda de la carretera", () => {
    const km = pathKm(BOGOTA_BARRANQUILLA);
    expect(km).toBeGreaterThan(850);
    expect(projectOnPath(BOGOTA_BARRANQUILLA, BOGOTA_BARRANQUILLA[0])).toEqual({ along: 0, offKm: 0 });
    const end = projectOnPath(BOGOTA_BARRANQUILLA, BOGOTA_BARRANQUILLA.at(-1)!);
    expect(end.along).toBeCloseTo(km, 6);
    expect(end.offKm).toBeCloseTo(0, 6);
  });

  it("en las puntas no recorta: detrás del comienzo es negativo y después del final pasa del largo", () => {
    const km = pathKm(BOGOTA_BARRANQUILLA);
    // Un poco antes de Bogotá, siguiendo la misma dirección hacia atrás.
    const [a, b] = BOGOTA_BARRANQUILLA;
    const behind = { lat: a.lat - (b.lat - a.lat) * 0.2, lng: a.lng - (b.lng - a.lng) * 0.2 };
    expect(projectOnPath(BOGOTA_BARRANQUILLA, behind).along).toBeLessThan(0);
    const [y, z] = BOGOTA_BARRANQUILLA.slice(-2);
    const after = { lat: z.lat + (z.lat - y.lat) * 0.2, lng: z.lng + (z.lng - y.lng) * 0.2 };
    expect(projectOnPath(BOGOTA_BARRANQUILLA, after).along).toBeGreaterThan(km);
  });
});
