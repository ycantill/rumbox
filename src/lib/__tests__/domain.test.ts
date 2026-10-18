import { describe, expect, it } from "vitest";
import {
  DRIVER_SPACES,
  VOLUMES,
  spaceFitsVolume,
  spaceInSentence,
  type DriverSpace,
  type Volume,
} from "../domain";

describe("spaceFitsVolume", () => {
  it("con solo espacio para paquetes caben sobres, pero no muebles ni una mudanza", () => {
    expect(spaceFitsVolume("solo_paquetes", "sobres")).toBe(true);
    expect(spaceFitsVolume("solo_paquetes", "carga_parcial")).toBe(false);
    expect(spaceFitsVolume("solo_paquetes", "medio_camion")).toBe(false);
  });

  it("quien lleva algunas cosas también lleva paquetes, pero no una habitación", () => {
    expect(spaceFitsVolume("carga_parcial", "sobres")).toBe(true);
    expect(spaceFitsVolume("carga_parcial", "carga_parcial")).toBe(true);
    expect(spaceFitsVolume("carga_parcial", "medio_camion")).toBe(false);
  });

  it("una casa de 2 habitaciones o más sirve para todo, y una habitación no lleva una casa", () => {
    expect(spaceFitsVolume("camion_entero", "camion_entero")).toBe(true);
    expect(spaceFitsVolume("medio_camion", "medio_camion")).toBe(true);
    expect(spaceFitsVolume("medio_camion", "camion_entero")).toBe(false);
  });

  it("cada tamaño del transportista lleva el mismo tamaño del cliente y ninguno más grande", () => {
    const spaces = Object.keys(DRIVER_SPACES) as DriverSpace[];
    const volumes = Object.keys(VOLUMES) as Volume[];
    spaces.forEach((space, i) => {
      volumes.forEach((volume, j) => expect(spaceFitsVolume(space, volume)).toBe(j <= i));
    });
  });
});

describe("tamaños de carga", () => {
  it("el cliente y el transportista eligen de la misma lista, en el mismo orden", () => {
    expect(Object.values(DRIVER_SPACES)).toEqual(Object.values(VOLUMES));
  });

  it("en el MVP no están los espacios del carro particular (baúl y asientos)", () => {
    expect(Object.keys(DRIVER_SPACES)).not.toContain("baul");
    expect(Object.keys(DRIVER_SPACES)).not.toContain("asientos");
  });

  it("la etiqueta se puede poner dentro de una frase", () => {
    expect(spaceInSentence("camion_entero")).toBe("una casa de 2 habitaciones o más");
    expect(spaceInSentence("solo_paquetes")).toBe("paquetes o sobres");
  });
});
