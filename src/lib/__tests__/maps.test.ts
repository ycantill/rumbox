import { describe, expect, it } from "vitest";
import { getCity } from "../cities";
import { mapsPlace, mapsUrl } from "../maps";

describe("mapsPlace", () => {
  it("lleva el municipio, su departamento y Colombia", () => {
    expect(mapsPlace(getCity("montelibano")!)).toBe("Montelíbano, Córdoba, Colombia");
  });

  it("quita el departamento entre paréntesis de los nombres repetidos", () => {
    const city = getCity("la-victoria-amazonas")!;
    expect(city.name).toBe("La Victoria (Amazonas)");
    expect(mapsPlace(city)).toBe("La Victoria, Amazonas, Colombia");
  });
});

describe("mapsUrl", () => {
  it("abre Google Maps navegando en carro hasta el destino, desde donde está el teléfono", () => {
    const url = new URL(mapsUrl(getCity("montelibano")!));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("Montelíbano, Córdoba, Colombia");
    expect(url.searchParams.get("travelmode")).toBe("driving");
    expect(url.searchParams.get("dir_action")).toBe("navigate");
    // Sin origen: Maps arranca desde donde está.
    expect(url.searchParams.has("origin")).toBe(false);
  });
});
