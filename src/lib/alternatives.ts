// Los otros caminos del viaje (Yohany, 22 de octubre de 2026): el servicio de
// rutas da el más rápido, pero el transportista puede ir por otro. Los caminos
// alternos de OpenRouteService solo sirven hasta 100 km, así que se arman
// pidiéndole el viaje pasando por un pueblo de cruce que no queda en el camino
// más rápido. Él escoge por cuál va en su tarjeta.

import { getCity, haversineKm, type City } from "./cities";
import { decodePath, pathKm, projectOnPath, projectOnSegment, type Point } from "./path";
import { HUBS, routeStops } from "./route";

export { HUBS };

const HUB_SET = new Set(HUBS);

/** Cuántos caminos, como mucho, se le muestran (el más rápido y dos más). */
export const MAX_ROUTES = 3;
/** Cuántos pueblos de cruce se prueban: cada uno es una consulta al servicio. */
export const MAX_VIAS = 5;
/** Qué tanto más largo que la línea recta puede ser el viaje pasando por el pueblo. */
export const VIA_MAX_DETOUR = 1.25;
/** Qué tan lejos del camino más rápido tiene que quedar el pueblo de cruce. */
export const VIA_OFF_FASTEST_KM = 25;
/** Qué tan lejos del camino más rápido puede quedar, como mucho: más lejos ya es otro viaje. */
export const VIA_MAX_OFF_KM = 80;
export const VIA_MAX_OFF_RATIO = 0.15;
/** Qué parte del viaje, al comienzo y al final, no se mira para buscar pueblos de cruce. */
export const VIA_MIN_T = 0.1;
/** Qué tan separados tienen que estar los pueblos de cruce que se prueban. */
export const VIA_MIN_SPACING_KM = 80;
/** Un camino que es más largo que esto, comparado con el más rápido, no se ofrece. */
export const ROUTE_MAX_RATIO = 1.4;
/** Qué tan lejos de los otros tiene que ir un camino para contar como distinto. */
export const DIFFERENT_KM = 10;
/** Qué parte del camino tiene que ir por otro lado para contar como distinto. */
export const DIFFERENT_SHARE = 0.2;

/**
 * Los pueblos de cruce por donde se piden los otros caminos: los que quedan
 * entre el origen y el destino sin alargar mucho el viaje, lejos del camino
 * más rápido (por ahí ya va) y separados entre sí.
 */
export function viaCandidates(from: Point, to: Point, fastest: readonly Point[] = []): City[] {
  const straight = haversineKm(from.lat, from.lng, to.lat, to.lng);
  if (straight === 0) return [];
  const ranked = hubCities()
    .map((c) => {
      const viaKm = haversineKm(from.lat, from.lng, c.lat, c.lng) + haversineKm(c.lat, c.lng, to.lat, to.lng);
      const offKm = fastest.length >= 2 ? projectOnPath(fastest, c).offKm : 0;
      return { city: c, ratio: viaKm / straight, t: projectOnSegment(from, to, c).along, offKm };
    })
    .filter(
      ({ ratio, t, offKm }) =>
        ratio <= VIA_MAX_DETOUR &&
        // En la mitad del viaje, no detrás del origen ni después del destino.
        t >= VIA_MIN_T &&
        t <= 1 - VIA_MIN_T &&
        (fastest.length < 2 ||
          (offKm > VIA_OFF_FASTEST_KM && offKm <= Math.max(VIA_MAX_OFF_KM, straight * VIA_MAX_OFF_RATIO))),
    )
    // Primero los que quedan más lejos del camino más rápido: dan caminos de
    // verdad distintos. Sin él, los que menos alargan el viaje.
    .sort((a, b) => b.offKm - a.offKm || a.ratio - b.ratio);

  const picked: City[] = [];
  for (const { city } of ranked) {
    if (picked.length >= MAX_VIAS) break;
    if (picked.some((p) => haversineKm(p.lat, p.lng, city.lat, city.lng) < VIA_MIN_SPACING_KM)) continue;
    picked.push(city);
  }
  return picked;
}

/**
 * Deja el camino más rápido (el primero) y los otros que van por otro lado y
 * no son mucho más largos, como mucho `MAX_ROUTES` en total. Todos en `encodePath`.
 */
export function distinctRoutes(fastest: string, others: readonly (string | null)[]): string[] {
  const main = decodePath(fastest);
  if (main.length < 2) return [fastest];
  const maxKm = pathKm(main) * ROUTE_MAX_RATIO;
  const kept: { route: string; path: Point[] }[] = [{ route: fastest, path: main }];
  const options = others
    .map((route) => ({ route, path: decodePath(route) }))
    .filter((o): o is { route: string; path: Point[] } => o.route !== null && o.path.length >= 2)
    // Los más cortos primero.
    .map((o) => ({ ...o, km: pathKm(o.path) }))
    .filter((o) => o.km <= maxKm)
    .sort((a, b) => a.km - b.km);
  for (const o of options) {
    if (kept.length >= MAX_ROUTES) break;
    if (kept.every((k) => differentShare(o.path, k.path) >= DIFFERENT_SHARE)) kept.push(o);
  }
  return kept.map((k) => k.route);
}

/** Qué parte de los puntos de `path` queda lejos de `other`. */
function differentShare(path: readonly Point[], other: readonly Point[]): number {
  const far = path.filter((p) => projectOnPath(other, p).offKm > DIFFERENT_KM).length;
  return far / path.length;
}

export type RouteOption = {
  /** "Por Sincelejo": el pueblo que más lo distingue de los otros caminos. */
  label: string;
  /** Algunos pueblos por donde pasa, en orden. */
  towns: string[];
};

/** Cómo se le muestra cada camino: por qué pueblo va y algunos por donde pasa. */
export function routeOptions(origin: string, destination: string, routes: readonly string[]): RouteOption[] {
  const paths = routes.map((r) => decodePath(r));
  const used = new Set<string>();
  return routes.map((route, i) => {
    const stops = routeStops(origin, destination, route)
      .slice(1, -1)
      .map((s) => s.city);
    const others = paths.filter((_, k) => k !== i && paths[k].length >= 2);
    // El pueblo del nombre sale de la lista de "¿Por dónde vas?": así, al
    // escoger "Por Manizales", Manizales aparece en ella.
    let best: City | null = null;
    let bestKm = 0;
    for (const c of stops) {
      if (used.has(c.slug)) continue;
      const km = Math.min(...others.map((p) => projectOnPath(p, c).offKm));
      // Los de cruce son más conocidos: ganan si se alejan casi lo mismo.
      const score = HUB_SET.has(c.slug) ? km * 1.5 : km;
      if (score > bestKm) {
        best = c;
        bestKm = score;
      }
    }
    if (best) used.add(best.slug);
    return {
      label: best ? `Por ${best.name}` : i === 0 ? "El más rápido" : "Otro camino",
      // El pueblo del nombre no se repite en la lista.
      towns: pickTowns(
        stops.filter((c) => c.slug !== best?.slug),
        4,
      ).map((c) => c.name),
    };
  });
}

function hubCities(): City[] {
  return HUBS.map((slug) => getCity(slug)).filter((c): c is City => Boolean(c));
}

/** Unos pocos pueblos repartidos a lo largo del camino. */
function pickTowns(stops: readonly City[], count: number): City[] {
  if (stops.length <= count) return [...stops];
  const step = stops.length / count;
  return Array.from({ length: count }, (_, k) => stops[Math.floor(k * step + step / 2)]);
}
