import { describe, expect, it } from "vitest";
import {
  DRIVER_SPACES,
  VOLUMES,
  slotsLeftToday,
  spaceFitsVolume,
  spaceInSentence,
  withSlot,
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

describe("slotsLeftToday", () => {
  it("temprano se puede ofrecer cualquier jornada", () => {
    expect(slotsLeftToday(7)).toEqual(["manana", "tarde", "noche", "todo_el_dia"]);
  });

  it("pasada la mañana ya no aparecen la mañana ni todo el día", () => {
    expect(slotsLeftToday(12)).toEqual(["tarde", "noche"]);
    expect(slotsLeftToday(17)).toEqual(["tarde", "noche"]);
  });

  it("de tarde-noche solo queda la noche, y después de las 10 no queda nada", () => {
    expect(slotsLeftToday(18)).toEqual(["noche"]);
    expect(slotsLeftToday(22)).toEqual([]);
  });
});

describe("withSlot", () => {
  it("pone la jornada después del día, dentro de una frase", () => {
    expect(withSlot("mañana", "manana")).toBe("mañana por la mañana");
    expect(withSlot("hoy", "tarde")).toBe("hoy por la tarde");
  });

  it("no dice \"todo el día\", ni nada si la solicitud es de antes y no tiene jornada", () => {
    expect(withSlot("hoy", "todo_el_dia")).toBe("hoy");
    expect(withSlot("el sábado 18 de octubre", null)).toBe("el sábado 18 de octubre");
  });
});
