import { describe, expect, it } from "vitest";
import { ROUTE_DISCOUNT, estimate } from "../pricing";

const base = {
  origin: "monteria",
  destination: "cartagena",
  labor: "yo_cargo" as const,
  stairsOrigin: 0,
  stairsDestination: 0,
};

describe("estimate", () => {
  it("cobra más por más volumen en la misma ruta", () => {
    const sobres = estimate({ ...base, volume: "sobres" }).total;
    const parcial = estimate({ ...base, volume: "carga_parcial" }).total;
    const medio = estimate({ ...base, volume: "medio_camion" }).total;
    const entero = estimate({ ...base, volume: "camion_entero" }).total;
    expect(sobres).toBeLessThan(parcial);
    expect(parcial).toBeLessThan(medio);
    expect(medio).toBeLessThan(entero);
  });

  it("suma escaleras y mano de obra como modificadores", () => {
    const plain = estimate({ ...base, volume: "medio_camion" });
    const extra = estimate({ ...base, volume: "medio_camion", labor: "ayudantes", stairsOrigin: 3 });
    expect(extra.labor).toBeGreaterThan(0);
    expect(extra.stairs).toBeGreaterThan(0);
    expect(extra.total).toBe(Math.round((plain.base + plain.distance + extra.labor + extra.stairs) / 1000) * 1000);
  });

  it("no cobra mano de obra ni escaleras a sobres", () => {
    const q = estimate({ ...base, volume: "sobres", labor: "ayudantes", stairsOrigin: 5 });
    expect(q.labor).toBe(0);
    expect(q.stairs).toBe(0);
  });

  it("aplica el descuento por ruta programada", () => {
    const q = estimate({ ...base, volume: "camion_entero" });
    expect(q.routeTotal).toBeCloseTo(q.total * (1 - ROUTE_DISCOUNT), -3);
  });

  it("usa una distancia urbana fija dentro de la misma ciudad", () => {
    const q = estimate({ ...base, destination: "monteria", volume: "carga_parcial" });
    expect(q.distanceKm).toBeGreaterThan(0);
    expect(q.distanceKm).toBeLessThan(20);
  });
});
