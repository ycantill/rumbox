import { describe, expect, it } from "vitest";
import { routeStops } from "../route";
import { routeDrawing } from "../route-drawing";

const trip = { origin: "monteria", destination: "cartagena" };
const stops = routeStops(trip.origin, trip.destination);

describe("routeDrawing", () => {
  it("al salir va en el origen y nada ha quedado atrás", () => {
    expect(routeDrawing(stops, trip, "monteria")).toEqual({ hereIndex: 0, offRoute: null, offRouteAt: -1, passedBefore: 0 });
  });

  it("en un pueblo de la ruta, los anteriores quedan atrás", () => {
    const i = 2;
    const d = routeDrawing(stops, trip, stops[i].city.slug);
    expect(d.hereIndex).toBe(i);
    expect(d.offRoute).toBeNull();
    expect(d.passedBefore).toBe(i);
  });

  it("en el destino, todo el camino quedó atrás", () => {
    expect(routeDrawing(stops, trip, "cartagena").passedBefore).toBe(stops.length - 1);
  });

  it("un pueblo fuera de la ruta se dibuja en su lugar del camino", () => {
    // Sincelejo queda entre Montería y Cartagena, pero no siempre es parada.
    const fuera = routeStops(trip.origin, trip.destination).some((s) => s.city.slug === "sincelejo") ? "planeta-rica" : "sincelejo";
    const d = routeDrawing(stops, trip, fuera);
    expect(d.hereIndex).toBe(-1);
    expect(d.offRoute?.slug).toBe(fuera);
    expect(d.offRouteAt).toBeGreaterThan(0);
    expect(d.offRouteAt).toBeLessThanOrEqual(stops.length);
    expect(d.passedBefore).toBe(d.offRouteAt);
  });

  it("un municipio que no existe no se dibuja", () => {
    expect(routeDrawing(stops, trip, "no-existe")).toEqual({ hereIndex: -1, offRoute: null, offRouteAt: -1, passedBefore: -1 });
  });
});
