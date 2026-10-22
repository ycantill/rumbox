import { describe, expect, it } from "vitest";
import { getCity } from "../cities";
import { decodePath, encodePath, pathKm, projectOnPath } from "../path";
import { ROAD_MAX_STOPS, ROAD_STOP_MAX_OFF_KM, ROUTE_MAX_STOPS, routeFromGeoJson, routeProgress, routeStops } from "../route";
import { BOGOTA_BARRANQUILLA, BOGOTA_BARRANQUILLA_ROUTE } from "./road-fixture";

describe("routeStops", () => {
  it("va del origen al destino, con pueblos en el camino y en orden", () => {
    const stops = routeStops("monteria", "cartagena");
    expect(stops[0].city.slug).toBe("monteria");
    expect(stops.at(-1)?.city.slug).toBe("cartagena");
    expect(stops.length).toBeGreaterThan(2);
    const ts = stops.map((s) => s.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    // Ningún pueblo sale dos veces.
    expect(new Set(stops.map((s) => s.city.slug)).size).toBe(stops.length);
  });

  it("en un viaje largo no pasa del máximo de pueblos", () => {
    expect(routeStops("bogota", "cartagena").length).toBeLessThanOrEqual(ROUTE_MAX_STOPS + 2);
  });

  it("sin destino, con \"Cualquier destino\" o con el mismo municipio no hay ruta", () => {
    expect(routeStops("monteria", "cualquiera")).toEqual([]);
    expect(routeStops("monteria", "")).toEqual([]);
    expect(routeStops("monteria", "monteria")).toEqual([]);
  });
});

describe("routeProgress", () => {
  it("dice qué tanto del viaje lleva", () => {
    expect(routeProgress("monteria", "cartagena", "monteria")).toBe(0);
    expect(routeProgress("monteria", "cartagena", "cartagena")).toBe(1);
    const middle = routeProgress("monteria", "cartagena", "sincelejo")!;
    expect(middle).toBeGreaterThan(0.2);
    expect(middle).toBeLessThan(0.8);
    expect(routeProgress("monteria", "cualquiera", "sincelejo")).toBeNull();
  });
});

describe("con la carretera guardada", () => {
  it("los pueblos son los de la carretera, no los de la línea recta", () => {
    const stops = routeStops("bogota", "barranquilla", BOGOTA_BARRANQUILLA_ROUTE);
    const slugs = stops.map((s) => s.city.slug);
    expect(slugs[0]).toBe("bogota");
    expect(slugs.at(-1)).toBe("barranquilla");
    expect(stops.length).toBeGreaterThan(8);
    expect(stops.length).toBeLessThanOrEqual(ROAD_MAX_STOPS + 2);
    const ts = stops.map((s) => s.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(new Set(slugs).size).toBe(slugs.length);
    // Todos quedan sobre la carretera.
    for (const s of stops) expect(projectOnPath(BOGOTA_BARRANQUILLA, s.city).offKm).toBeLessThanOrEqual(ROAD_STOP_MAX_OFF_KM);
    expect(slugs).toContain("aguachica");
    // La línea recta pasa por Pacho y Puerto Berrío.
    expect(routeStops("bogota", "barranquilla").map((s) => s.city.slug)).toContain("pacho");
    expect(slugs).not.toContain("pacho");
    expect(slugs).not.toContain("puerto-berrio");
  });

  it("en cada tramo prefiere un pueblo de cruce, que todos conocen", () => {
    const road = encodePath(
      ["bogota", "honda", "fresno", "manizales", "neira", "aranzazu", "salamina-caldas", "aguadas", "la-pintada", "medellin"].map(
        (slug) => getCity(slug)!,
      ),
    );
    const slugs = routeStops("bogota", "medellin", road).map((s) => s.city.slug);
    expect(slugs).toContain("manizales");
    expect(slugs).toContain("honda");
  });

  it("salen todos los pueblos por donde pasa, aunque vaya por una variante sin entrar", () => {
    // Barranquilla → Montelíbano por la Troncal, pasando a 5 km del centro de
    // cada pueblo, como por una variante.
    const towns = [
      "sabanalarga-atlantico", "san-juan-nepomuceno", "san-jacinto", "el-carmen-de-bolivar", "ovejas",
      "corozal", "sincelejo", "sampues", "chinu", "sahagun", "planeta-rica", "pueblo-nuevo", "buenavista-cordoba",
    ];
    const variant = (slug: string) => {
      const c = getCity(slug)!;
      return { lat: c.lat, lng: c.lng + 0.045 };
    };
    const road = encodePath([getCity("barranquilla")!, ...towns.map(variant), getCity("montelibano")!]);
    const slugs = routeStops("barranquilla", "montelibano", road).map((s) => s.city.slug);
    for (const t of towns) expect(slugs).toContain(t);
    // Ciénaga de Oro queda a 15 km de la Troncal: por ahí no pasa.
    expect(slugs).not.toContain("cienaga-de-oro");
  });

  it("dice qué tanto lleva sobre la carretera", () => {
    const at = (slug: string) => routeProgress("bogota", "barranquilla", slug, BOGOTA_BARRANQUILLA_ROUTE)!;
    expect(at("bogota")).toBe(0);
    expect(at("barranquilla")).toBe(1);
    expect(at("aguachica")).toBeGreaterThan(at("puerto-boyaca"));
    expect(at("bosconia")).toBeGreaterThan(at("aguachica"));
    expect(at("bosconia")).toBeLessThan(1);
  });
});

describe("routeFromGeoJson", () => {
  const bogota = getCity("bogota")!;
  const barranquilla = getCity("barranquilla")!;
  const geojson = (coords: unknown) => ({ type: "FeatureCollection", features: [{ geometry: { coordinates: coords } }] });
  // Una carretera con muchos puntos, como la que manda el servicio.
  const dense = BOGOTA_BARRANQUILLA.flatMap((p, i) => {
    const q = BOGOTA_BARRANQUILLA[i + 1];
    if (!q) return [[p.lng, p.lat]];
    return Array.from({ length: 50 }, (_, k) => [p.lng + ((q.lng - p.lng) * k) / 50, p.lat + ((q.lat - p.lat) * k) / 50]);
  });

  it("guarda la carretera simplificada", () => {
    const route = routeFromGeoJson(geojson(dense), bogota, barranquilla)!;
    const path = decodePath(route);
    expect(path.length).toBeLessThan(dense.length / 10);
    expect(pathKm(path)).toBeCloseTo(pathKm(BOGOTA_BARRANQUILLA), 0);
  });

  it("si la respuesta no se ve bien, no hay carretera", () => {
    expect(routeFromGeoJson({}, bogota, barranquilla)).toBeNull();
    expect(routeFromGeoJson(geojson([[1, 2]]), bogota, barranquilla)).toBeNull();
    expect(routeFromGeoJson(geojson([["a", 2], [3, 4]]), bogota, barranquilla)).toBeNull();
    // Mucho más larga que la línea recta: da la vuelta por otro lado.
    const detour = [[bogota.lng, bogota.lat], [-68, 2], [-80, 12], [barranquilla.lng, barranquilla.lat]];
    expect(routeFromGeoJson(geojson(detour), bogota, barranquilla)).toBeNull();
  });
});
