// Motor de estimación: Tarifa base plana + modificadores transparentes
// (documento de producto, sección 7). Valores en pesos colombianos (COP).
// Las tarifas son un punto de partida para el piloto y deben calibrarse con
// precios reales del mercado.

import { roadDistanceKm } from "./cities";
import type { ClientLabor, Volume } from "./domain";

type Rate = { base: number; perKm: number; perFloor: number };

export const RATES: Record<Volume, Rate> = {
  sobres: { base: 12_000, perKm: 250, perFloor: 0 },
  carga_parcial: { base: 60_000, perKm: 1_500, perFloor: 8_000 },
  medio_camion: { base: 120_000, perKm: 2_600, perFloor: 15_000 },
  camion_entero: { base: 200_000, perKm: 3_800, perFloor: 25_000 },
};

export const LABOR_FEE: Record<ClientLabor, number> = {
  yo_cargo: 0,
  conductor: 30_000,
  ayudantes: 80_000,
};

/** Descuento cuando la solicitud cae en la ruta declarada de un transportista. */
export const ROUTE_DISCOUNT = 0.25;

export type QuoteInput = {
  origin: string;
  destination: string;
  volume: Volume;
  labor: ClientLabor;
  /** Pisos por escalera en origen (0 = planta baja o ascensor). */
  stairsOrigin: number;
  stairsDestination: number;
};

export type Quote = {
  distanceKm: number;
  base: number;
  distance: number;
  labor: number;
  stairs: number;
  total: number;
  /** Precio si hay un transportista en Modo Ruta compatible. */
  routeTotal: number;
};

const roundTo = (n: number, step = 1_000) => Math.round(n / step) * step;

export function estimate(input: QuoteInput): Quote {
  const rate = RATES[input.volume];
  const distanceKm = roadDistanceKm(input.origin, input.destination);
  const floors = clampFloors(input.stairsOrigin) + clampFloors(input.stairsDestination);

  const base = rate.base;
  const distance = rate.perKm * distanceKm;
  // Para sobres el conductor no carga nada pesado: la mano de obra no aplica.
  const labor = input.volume === "sobres" ? 0 : LABOR_FEE[input.labor];
  const stairs = rate.perFloor * floors;

  const total = roundTo(base + distance + labor + stairs);
  const routeTotal = roundTo(total * (1 - ROUTE_DISCOUNT));
  return { distanceKm, base, distance, labor, stairs, total, routeTotal };
}

function clampFloors(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 30);
}

export function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}
