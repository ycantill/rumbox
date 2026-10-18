// Motor de emparejamiento (documento de producto, sección 8).
//
// En el MVP el transportista siempre va de viaje (Modo Ruta): dice de dónde
// sale, hacia dónde va y qué día. Atiende solicitudes de ese mismo día cuyo
// origen y destino quedan sobre su corredor vial y en el mismo sentido de
// viaje. Las rutas que se repiten (diarias o semanales) son una mejora futura
// para después del MVP.

import { getCity, haversineKm } from "./cities";
import {
  LABOR_LEVEL,
  LABOR_NEED,
  spaceFitsVolume,
  type ClientLabor,
  type DriverLabor,
  type DriverSpace,
  type Volume,
} from "./domain";

/**
 * Desvío máximo respecto a la línea recta del corredor. Las carreteras se
 * alejan más de la línea recta en trayectos largos, así que la tolerancia
 * crece con la longitud del corredor.
 */
export const CORRIDOR_MIN_TOLERANCE_KM = 35;
export const CORRIDOR_TOLERANCE_RATIO = 0.25;

export type AvailabilityLike = {
  origin_city: string;
  destination_city: string;
  service_date: string; // YYYY-MM-DD: el día del viaje
  space: DriverSpace;
  labor: DriverLabor;
};

export type RequestLike = {
  origin_city: string;
  destination_city: string;
  service_date: string;
  volume: Volume;
  labor: ClientLabor;
};

/** Si el servicio que pide el cliente le sirve al transportista en su viaje. */
export function matchesTrip(a: AvailabilityLike, r: RequestLike): boolean {
  if (r.service_date !== a.service_date) return false;
  if (!spaceFitsVolume(a.space, r.volume)) return false;
  if (r.volume !== "sobres" && LABOR_LEVEL[a.labor] < LABOR_NEED[r.labor]) return false;

  const driverFrom = getCity(a.origin_city);
  const driverTo = getCity(a.destination_city);
  const from = getCity(r.origin_city);
  const to = getCity(r.destination_city);
  if (!driverFrom || !driverTo || !from || !to) return false;

  const corridorKm = haversineKm(driverFrom.lat, driverFrom.lng, driverTo.lat, driverTo.lng);
  const tolerance = Math.max(CORRIDOR_MIN_TOLERANCE_KM, corridorKm * CORRIDOR_TOLERANCE_RATIO);
  const pFrom = projectOnSegment(driverFrom, driverTo, from);
  const pTo = projectOnSegment(driverFrom, driverTo, to);
  const onCorridor = pFrom.offKm <= tolerance && pTo.offKm <= tolerance;
  // Mismo sentido: la recogida va antes que la entrega sobre el trayecto.
  // Un servicio dentro de una sola ciudad del corredor también vale.
  return onCorridor && pFrom.t <= pTo.t;
}

/**
 * Deja una sola fila por clave, la primera que aparece. Las filas deben venir de
 * la más nueva a la más vieja dentro de cada clave, así que queda la última que
 * se guardó. Sirve para no mostrar dos veces al mismo transportista, ni el mismo
 * viaje de un cliente que pidió precio varias veces.
 */
export function newestBy<T>(rows: readonly T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const k = key(row);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

type Point = { lat: number; lng: number };

/**
 * Proyecta p sobre el segmento a→b usando una proyección equirectangular local
 * (suficiente para distancias de cientos de km). Devuelve la posición relativa
 * t ∈ [0, 1] y la distancia perpendicular en km.
 */
export function projectOnSegment(a: Point, b: Point, p: Point): { t: number; offKm: number } {
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const bx = (b.lng - a.lng) * kmPerDegLng;
  const by = (b.lat - a.lat) * kmPerDegLat;
  const px = (p.lng - a.lng) * kmPerDegLng;
  const py = (p.lat - a.lat) * kmPerDegLat;
  const len2 = bx * bx + by * by;
  const raw = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  const t = Math.max(0, Math.min(1, raw));
  const dx = px - t * bx;
  const dy = py - t * by;
  return { t, offKm: Math.sqrt(dx * dx + dy * dy) };
}
