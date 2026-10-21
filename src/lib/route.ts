// La ruta del transportista, pueblo por pueblo, y por dónde va.
//
// No hay mapa de carreteras: los pueblos de la ruta son los municipios que
// quedan más cerca de la línea entre su origen y su destino, uno cada tanto.
// Sirven para que él vea su camino y marque por dónde va. Por dónde va se
// guarda como el municipio más cercano a su ubicación: las coordenadas no
// salen del teléfono.

import { CITIES, getCity, haversineKm, type City } from "./cities";
import { projectOnSegment } from "./matching";

/** Cada cuántos km, más o menos, sale un pueblo en la ruta. */
export const ROUTE_STEP_KM = 40;
/** Cuántos pueblos, como mucho, entre el origen y el destino. */
export const ROUTE_MAX_STOPS = 12;
/** Qué tan lejos de la línea puede quedar un pueblo de la ruta. */
export const ROUTE_STOP_MAX_OFF_KM = 20;

export type RouteStop = {
  city: City;
  /** Qué tanto del viaje lleva al pasar por aquí: 0 en el origen, 1 en el destino. */
  t: number;
};

/** Los pueblos del camino, en orden, del origen al destino (los dos incluidos). */
export function routeStops(originSlug: string, destinationSlug: string): RouteStop[] {
  const from = getCity(originSlug);
  const to = getCity(destinationSlug);
  if (!from || !to || from.slug === to.slug) return [];

  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const count = Math.min(ROUTE_MAX_STOPS, Math.max(0, Math.round(km / ROUTE_STEP_KM) - 1));
  const picked = new Set([from.slug, to.slug]);
  const stops: RouteStop[] = [];
  for (let i = 1; i <= count; i++) {
    const f = i / (count + 1);
    const lat = from.lat + (to.lat - from.lat) * f;
    const lng = from.lng + (to.lng - from.lng) * f;
    // El municipio más cercano a ese punto de la línea, si hay uno cerca.
    let best: City | null = null;
    let bestKm = ROUTE_STOP_MAX_OFF_KM;
    for (const c of CITIES) {
      if (picked.has(c.slug)) continue;
      const d = haversineKm(lat, lng, c.lat, c.lng);
      if (d <= bestKm) {
        best = c;
        bestKm = d;
      }
    }
    if (!best) continue;
    picked.add(best.slug);
    stops.push({ city: best, t: projectOnSegment(from, to, best).t });
  }
  stops.sort((a, b) => a.t - b.t);
  return [{ city: from, t: 0 }, ...stops, { city: to, t: 1 }];
}

/** Qué tanto del viaje lleva quien está en `currentSlug`: 0 en el origen, 1 en el destino. */
export function routeProgress(originSlug: string, destinationSlug: string, currentSlug: string): number | null {
  const from = getCity(originSlug);
  const to = getCity(destinationSlug);
  const now = getCity(currentSlug);
  if (!from || !to || !now) return null;
  return projectOnSegment(from, to, now).t;
}
