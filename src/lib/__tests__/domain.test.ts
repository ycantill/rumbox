import { describe, expect, it } from "vitest";
import { DRIVER_SPACES, SERVICES, UNSIZED_SPACE, servicesOf } from "../domain";

describe("sin tamaño ni espacio", () => {
  it("el viaje nuevo que guarda el navegador sigue valiendo", () => {
    expect(Object.keys(DRIVER_SPACES)).toContain(UNSIZED_SPACE);
  });

  it("los espacios del carro particular (baúl y asientos) ya no valen", () => {
    expect(Object.keys(DRIVER_SPACES)).not.toContain("baul");
    expect(Object.keys(DRIVER_SPACES)).not.toContain("asientos");
  });
});

describe("servicios", () => {
  it("son tres, solo carga, en el orden del diseño", () => {
    expect(Object.keys(SERVICES)).toEqual(["mudanza", "flete", "encomienda"]);
  });

  it("de una lista deja los que existen, sin repetir y en orden; sin lista, null", () => {
    expect(servicesOf(["encomienda", "mudanza", "mudanza", "trasteo"])).toEqual(["mudanza", "encomienda"]);
    expect(servicesOf(null)).toBeNull();
    expect(servicesOf("mudanza")).toBeNull();
  });

  it("los encargos y las diligencias salieron del MVP: lo guardado con ellos los pierde", () => {
    expect(servicesOf(["encargo", "flete", "diligencia"])).toEqual(["flete"]);
    expect(servicesOf(["encargo", "diligencia"])).toEqual([]);
  });
});

