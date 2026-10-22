import { describe, expect, it } from "vitest";
import {
  MAX_ROUTES,
  VIA_MAX_DETOUR,
  VIA_MIN_SPACING_KM,
  VIA_OFF_FASTEST_KM,
  distinctRoutes,
  routeOptions,
  viaCandidates,
} from "../alternatives";
import { getCity, haversineKm } from "../cities";
import { decodePath, encodePath, projectOnPath, type Point } from "../path";

// Caminos de prueba armados con los pueblos por donde pasan.
const road = (...slugs: string[]): string =>
  encodePath(
    slugs.map((s): Point => {
      const c = getCity(s);
      if (!c) throw new Error(s);
      return { lat: c.lat, lng: c.lng };
    }),
  );

// De Bogotá a Medellín: por la autopista (Puerto Triunfo) o por Manizales.
const POR_AUTOPISTA = road(
  "bogota", "villeta", "guaduas", "honda", "puerto-triunfo", "san-luis-antioquia", "marinilla", "guarne", "medellin",
);
const POR_MANIZALES = road(
  "bogota", "villeta", "guaduas", "honda", "san-sebastian-de-mariquita", "fresno", "manizales", "la-pintada", "medellin",
);
// Casi la misma autopista, con un desvío de pocos km.
const CASI_IGUAL = road(
  "bogota", "villeta", "guaduas", "honda", "puerto-triunfo", "cocorna", "marinilla", "guarne", "medellin",
);
// Una vuelta enorme por Bucaramanga.
const MUY_LARGO = road("bogota", "tunja", "bucaramanga", "barrancabermeja", "puerto-berrio", "medellin");

describe("viaCandidates", () => {
  const from = getCity("bogota")!;
  const to = getCity("medellin")!;

  it("prueba pueblos de cruce entre el origen y el destino, separados y sin alargar mucho el viaje", () => {
    const vias = viaCandidates(from, to);
    expect(vias.length).toBeGreaterThan(0);
    const straight = haversineKm(from.lat, from.lng, to.lat, to.lng);
    for (const v of vias) {
      expect(v.slug).not.toBe("bogota");
      expect(v.slug).not.toBe("medellin");
      const viaKm = haversineKm(from.lat, from.lng, v.lat, v.lng) + haversineKm(v.lat, v.lng, to.lat, to.lng);
      expect(viaKm / straight).toBeLessThanOrEqual(VIA_MAX_DETOUR);
    }
    for (const a of vias)
      for (const b of vias)
        if (a !== b) expect(haversineKm(a.lat, a.lng, b.lat, b.lng)).toBeGreaterThanOrEqual(VIA_MIN_SPACING_KM);
  });

  it("no prueba los que quedan en el camino más rápido: por ahí ya va", () => {
    const fastest = decodePath(POR_AUTOPISTA);
    const vias = viaCandidates(from, to, fastest);
    expect(vias.map((v) => v.slug)).not.toContain("puerto-triunfo");
    expect(vias.map((v) => v.slug)).not.toContain("honda");
    for (const v of vias) expect(projectOnPath(fastest, v).offKm).toBeGreaterThan(VIA_OFF_FASTEST_KM);
    // Por Manizales es el otro camino de verdad: La Pintada o Fresno quedan en él.
    expect(vias.some((v) => ["la-pintada", "fresno", "manizales"].includes(v.slug))).toBe(true);
  });

  it("no prueba pueblos lejísimos, que ya serían otro viaje", () => {
    const vias = viaCandidates(from, to, decodePath(POR_AUTOPISTA)).map((v) => v.slug);
    expect(vias).not.toContain("cali");
    expect(vias).not.toContain("bucaramanga");
  });

  it("en un viaje corto, sin pueblos de cruce en el medio, no prueba ninguno", () => {
    expect(viaCandidates(getCity("monteria")!, getCity("cerete")!)).toEqual([]);
  });
});

describe("distinctRoutes", () => {
  it("deja el más rápido primero y los que van por otro lado", () => {
    expect(distinctRoutes(POR_AUTOPISTA, [POR_MANIZALES])).toEqual([POR_AUTOPISTA, POR_MANIZALES]);
  });

  it("no ofrece dos veces casi el mismo camino, ni uno mucho más largo, ni los que fallaron", () => {
    expect(distinctRoutes(POR_AUTOPISTA, [CASI_IGUAL, MUY_LARGO, null, POR_MANIZALES])).toEqual([
      POR_AUTOPISTA,
      POR_MANIZALES,
    ]);
    expect(distinctRoutes(POR_AUTOPISTA, [POR_AUTOPISTA, null])).toEqual([POR_AUTOPISTA]);
  });

  it(`ofrece como mucho ${MAX_ROUTES}`, () => {
    const porTunja = road("bogota", "tunja", "barbosa-santander", "puerto-berrio", "medellin");
    const porIbague = road("bogota", "girardot", "ibague", "armenia", "pereira", "manizales", "medellin");
    expect(distinctRoutes(POR_AUTOPISTA, [POR_MANIZALES, porTunja, porIbague]).length).toBeLessThanOrEqual(MAX_ROUTES);
  });
});

describe("routeOptions", () => {
  it("nombra cada camino por el pueblo que lo distingue y dice por dónde pasa", () => {
    const [autopista, manizales] = routeOptions("bogota", "medellin", [POR_AUTOPISTA, POR_MANIZALES]);
    expect(manizales.label).toBe("Por Manizales");
    expect(autopista.label).not.toBe(manizales.label);
    expect(autopista.label.startsWith("Por ")).toBe(true);
    expect(manizales.towns.length).toBeGreaterThan(0);
    expect(manizales.towns.length).toBeLessThanOrEqual(4);
    // Ni el origen ni el destino salen como pueblos por donde pasa.
    expect(manizales.towns).not.toContain("Bogotá");
    expect(manizales.towns).not.toContain("Medellín");
  });
});
