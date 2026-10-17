import { describe, expect, it } from "vitest";
import {
  DRIVER_SPACES,
  VEHICLE_SPACES,
  VEHICLE_TYPES,
  slotsLeftToday,
  spaceFitsVehicle,
  spaceFitsVolume,
  type DriverSpace,
} from "../domain";

describe("spaceFitsVolume", () => {
  it("con solo espacio para paquetes caben sobres, pero no muebles ni una mudanza", () => {
    expect(spaceFitsVolume("solo_paquetes", "sobres")).toBe(true);
    expect(spaceFitsVolume("solo_paquetes", "carga_parcial")).toBe(false);
    expect(spaceFitsVolume("solo_paquetes", "medio_camion")).toBe(false);
  });

  it("un camión entero sirve para todo, y medio camión no lleva una casa completa", () => {
    expect(spaceFitsVolume("camion_entero", "camion_entero")).toBe(true);
    expect(spaceFitsVolume("medio_camion", "medio_camion")).toBe(true);
    expect(spaceFitsVolume("medio_camion", "camion_entero")).toBe(false);
  });
});

describe("spaceFitsVehicle", () => {
  it("un carro particular no ofrece camión entero ni medio camión", () => {
    expect(spaceFitsVehicle("carro", "camion_entero")).toBe(false);
    expect(spaceFitsVehicle("carro", "medio_camion")).toBe(false);
    expect(spaceFitsVehicle("carro", "baul")).toBe(true);
  });

  it("un pick-up no ofrece camión entero", () => {
    expect(spaceFitsVehicle("pickup", "camion_entero")).toBe(false);
    expect(spaceFitsVehicle("pickup", "medio_camion")).toBe(true);
  });

  it("los camiones no ofrecen baúl ni asientos", () => {
    expect(spaceFitsVehicle("furgon", "baul")).toBe(false);
    expect(spaceFitsVehicle("estacas", "asientos")).toBe(false);
  });

  it("cada vehículo tiene al menos una opción y todo espacio sirve para algún vehículo", () => {
    for (const v of Object.keys(VEHICLE_TYPES) as (keyof typeof VEHICLE_TYPES)[]) {
      expect(VEHICLE_SPACES[v].length).toBeGreaterThan(0);
    }
    const used = new Set(Object.values(VEHICLE_SPACES).flat());
    for (const s of Object.keys(DRIVER_SPACES) as DriverSpace[]) expect(used.has(s)).toBe(true);
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
