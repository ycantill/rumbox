// Motor de emparejamiento (documento de producto, sección 8).
//
// Dos cosas independientes:
// - Alcance: "local" atiende servicios que empiezan y terminan cerca de su
//   ciudad; "nacional" atiende además los que salen de su zona hacia cualquier
//   otra ciudad.
// - Destino (opcional): activa el Modo "Ruta". Además de su zona, atiende
//   solicitudes cuyo origen y destino quedan sobre su corredor vial y en el
//   mismo sentido de viaje. Ese match tiene descuento para el cliente.

import { getCity, haversineKm } from "./cities";
import {
  LABOR_LEVEL,
  LABOR_NEED,
  SPACE_CAPACITY,
  VOLUME_LEVEL,
  type ClientLabor,
  type Coverage,
  type DriverLabor,
  type DriverSpace,
  type Volume,
} from "./domain";

/** Radio en km alrededor de la ciudad base del transportista ("su zona"). */
export const LOCAL_RADIUS_KM = 40;
/**
 * Desvío máximo respecto a la línea recta del corredor en Modo Ruta. Las
 * carreteras se alejan más de la línea recta en trayectos largos, así que la
 * tolerancia crece con la longitud del corredor.
 */
export const CORRIDOR_MIN_TOLERANCE_KM = 35;
export const CORRIDOR_TOLERANCE_RATIO = 0.25;

export type AvailabilityLike = {
  origin_city: string;
  destination_city: string | null;
  coverage: Coverage;
  service_date: string; // YYYY-MM-DD
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

/** "ruta": la carga va sobre su corredor. "zona": sale de su ciudad o alrededores. */
export type MatchKind = "ruta" | "zona";

export function matchKind(a: AvailabilityLike, r: RequestLike): MatchKind | null {
  if (a.service_date !== r.service_date) return null;
  if (SPACE_CAPACITY[a.space] < VOLUME_LEVEL[r.volume]) return null;
  if (r.volume !== "sobres" && LABOR_LEVEL[a.labor] < LABOR_NEED[r.labor]) return null;

  const driverFrom = getCity(a.origin_city);
  const from = getCity(r.origin_city);
  const to = getCity(r.destination_city);
  if (!driverFrom || !from || !to) return null;

  // Primero la ruta: es la que le da descuento al cliente.
  const driverTo = a.destination_city ? getCity(a.destination_city) : undefined;
  if (driverTo && onRoute(driverFrom, driverTo, from, to)) return "ruta";

  const near = (p: Point) => haversineKm(driverFrom.lat, driverFrom.lng, p.lat, p.lng) <= LOCAL_RADIUS_KM;
  if (!near(from)) return null;
  return a.coverage === "nacional" || near(to) ? "zona" : null;
}

function onRoute(driverFrom: Point, driverTo: Point, from: Point, to: Point): boolean {
  const corridorKm = haversineKm(driverFrom.lat, driverFrom.lng, driverTo.lat, driverTo.lng);
  const tolerance = Math.max(CORRIDOR_MIN_TOLERANCE_KM, corridorKm * CORRIDOR_TOLERANCE_RATIO);
  const pFrom = projectOnSegment(driverFrom, driverTo, from);
  const pTo = projectOnSegment(driverFrom, driverTo, to);
  const onCorridor = pFrom.offKm <= tolerance && pTo.offKm <= tolerance;
  // Mismo sentido: la recogida va antes que la entrega sobre el trayecto.
  // Un servicio dentro de una sola ciudad del corredor también vale.
  return onCorridor && pFrom.t <= pTo.t;
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
