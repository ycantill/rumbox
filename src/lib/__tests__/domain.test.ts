import { describe, expect, it } from "vitest";
import { DRIVER_SPACES, SERVICES, UNSIZED_SPACE, UNSIZED_VOLUME, VOLUMES, servicesOf } from "../domain";

describe("sin tamaño ni espacio", () => {
  it("lo nuevo guarda un valor fijo que la base acepta", () => {
    expect(Object.keys(VOLUMES)).toContain(UNSIZED_VOLUME);
    expect(Object.keys(DRIVER_SPACES)).toContain(UNSIZED_SPACE);
  });

  it("los espacios del carro particular (baúl y asientos) ya no valen", () => {
    expect(Object.keys(DRIVER_SPACES)).not.toContain("baul");
    expect(Object.keys(DRIVER_SPACES)).not.toContain("asientos");
  });
});

describe("servicios", () => {
  it("son cinco, en el orden del diseño", () => {
    expect(Object.keys(SERVICES)).toEqual(["mudanza", "flete", "encomienda", "encargo", "diligencia"]);
  });

  it("de una lista deja los que existen, sin repetir y en orden; sin lista, null", () => {
    expect(servicesOf(["diligencia", "mudanza", "mudanza", "trasteo"])).toEqual(["mudanza", "diligencia"]);
    expect(servicesOf(null)).toBeNull();
    expect(servicesOf("mudanza")).toBeNull();
  });
});

