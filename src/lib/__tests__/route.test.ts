import { describe, expect, it } from "vitest";
import { ROUTE_MAX_STOPS, routeProgress, routeStops } from "../route";

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
