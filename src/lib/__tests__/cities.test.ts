import { describe, expect, it } from "vitest";
import { CITIES, nearestCity } from "../cities";

describe("CITIES", () => {
  it("cada municipio tiene un slug y un nombre únicos", () => {
    expect(new Set(CITIES.map((c) => c.slug)).size).toBe(CITIES.length);
    // Con nombres únicos, "Buenavista → Sincelejo" no se presta a confusión.
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(CITIES.length);
  });

  it("Córdoba y Sucre tienen todos sus municipios", () => {
    expect(CITIES.filter((c) => c.department === "Córdoba")).toHaveLength(30);
    expect(CITIES.filter((c) => c.department === "Sucre")).toHaveLength(26);
  });

  it("las coordenadas quedan dentro de Colombia", () => {
    for (const c of CITIES) {
      expect(c.lat, c.slug).toBeGreaterThan(-4.3);
      expect(c.lat, c.slug).toBeLessThan(12.5);
      expect(c.lng, c.slug).toBeGreaterThan(-79.1);
      expect(c.lng, c.slug).toBeLessThan(-66.8);
    }
  });
});

describe("nearestCity", () => {
  it("con el botón Ubicarme encuentra el pueblo, no uno vecino", () => {
    // Cerca de la plaza de Momil, que antes no estaba en la lista y quedaba en Lorica o Purísima.
    expect(nearestCity(9.239, -75.676).slug).toBe("momil");
    expect(nearestCity(8.313, -75.145).slug).toBe("ayapel");
  });
});
