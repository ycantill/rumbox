import { describe, expect, it } from "vitest";
import { getCity } from "../cities";
import { isAppleMobile, mapsPlace, mapsUrl } from "../maps";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-A155M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

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

describe("isAppleMobile", () => {
  it("reconoce el iPhone y el iPad, que se presenta como un Mac con pantalla táctil", () => {
    expect(isAppleMobile(IPHONE, 5)).toBe(true);
    expect(isAppleMobile(IPAD, 5)).toBe(true);
  });

  it("no confunde un Android ni un Mac de escritorio", () => {
    expect(isAppleMobile(ANDROID, 5)).toBe(false);
    expect(isAppleMobile(IPAD, 0)).toBe(false);
  });
});

describe("mapsUrl", () => {
  it("en Android abre Google Maps navegando en carro, desde donde está el teléfono", () => {
    const url = new URL(mapsUrl(getCity("montelibano")!, false));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("Montelíbano, Córdoba, Colombia");
    expect(url.searchParams.get("travelmode")).toBe("driving");
    expect(url.searchParams.get("dir_action")).toBe("navigate");
    // Sin origen: el mapa arranca desde donde está.
    expect(url.searchParams.has("origin")).toBe(false);
  });

  it("en iPhone abre Mapas de Apple en carro, desde donde está el teléfono", () => {
    const url = new URL(mapsUrl(getCity("montelibano")!, true));
    expect(url.origin + url.pathname).toBe("https://maps.apple.com/");
    expect(url.searchParams.get("daddr")).toBe("Montelíbano, Córdoba, Colombia");
    expect(url.searchParams.get("dirflg")).toBe("d");
    expect(url.searchParams.has("saddr")).toBe(false);
  });
});
