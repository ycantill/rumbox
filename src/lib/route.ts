// La ruta del transportista, pueblo por pueblo, y por dónde va.
//
// Los pueblos de la ruta son los municipios por donde pasa la carretera. La
// carretera se calcula una vez, al ponerse disponible (`directions.ts`), y se
// guarda. Si no se pudo calcular, salen los municipios más cercanos a la línea
// recta entre el origen y el destino, uno cada tanto. Sirven para que él
// escoja por dónde va.

import { CITIES, getCity, haversineKm, type City } from "./cities";
import { decodePath, encodePath, pathKm, projectOnPath, projectOnSegment, simplifyPath, type Point } from "./path";

/** Cada cuántos km, más o menos, sale un pueblo en la ruta. */
export const ROUTE_STEP_KM = 40;
/** Cuántos pueblos, como mucho, entre el origen y el destino. */
export const ROUTE_MAX_STOPS = 12;
/** Qué tan lejos de la línea recta puede quedar un pueblo de la ruta. */
export const ROUTE_STOP_MAX_OFF_KM = 20;
/**
 * Qué tan lejos de la carretera puede quedar el centro de un pueblo por donde
 * pasa. Muchas carreteras pasan por una variante, sin entrar al pueblo
 * (Yohany, 22 de octubre de 2026): con 4 km se quedaban pueblos por fuera.
 */
export const ROAD_STOP_MAX_OFF_KM = 6;
/**
 * Cuántos pueblos, como mucho, entre el origen y el destino cuando hay
 * carretera. Salen todos por donde pasa; solo en un viaje muy largo se deja
 * uno cada tanto.
 */
export const ROAD_MAX_STOPS = 40;

/**
 * Pueblos de cruce: capitales y pueblos donde se juntan las carreteras
 * principales. En la lista de "¿Por dónde vas?" de un viaje muy largo van
 * antes que los otros pueblos: son los que más gente conoce.
 */
export const HUBS = [
  "bogota", "medellin", "cali", "barranquilla", "cartagena", "bucaramanga", "cucuta",
  "pereira", "manizales", "armenia", "ibague", "neiva", "pasto", "popayan",
  "villavicencio", "tunja", "monteria", "sincelejo", "valledupar", "santa-marta",
  "riohacha", "florencia-caqueta", "yopal", "quibdo", "mocoa", "arauca",
  "honda", "la-dorada", "puerto-boyaca", "puerto-berrio", "puerto-triunfo",
  "aguachica", "bosconia", "caucasia", "planeta-rica", "magangue",
  "el-carmen-de-bolivar", "lorica", "turbo", "apartado", "girardot", "espinal",
  "duitama", "sogamoso", "san-gil", "barbosa-santander", "chiquinquira",
  "zipaquira", "fusagasuga", "cartago", "tulua", "guadalajara-de-buga", "palmira",
  "buenaventura", "garzon", "pitalito", "santa-cruz-de-mompox", "barrancabermeja",
  "ocana", "pamplona", "maicao", "fundacion", "plato", "el-banco", "ayapel",
  "montelibano", "sahagun", "chigorodo", "santa-fe-de-antioquia", "yarumal",
  "rionegro-antioquia", "la-pintada", "san-sebastian-de-mariquita", "fresno",
  "granada-meta", "puerto-lopez", "aguazul", "curumani", "san-alberto", "cimitarra",
  "guaduas", "villeta", "facatativa", "melgar", "chaparral", "sabanalarga-atlantico",
  "calamar-bolivar",
];

const HUB_SET = new Set(HUBS);

export type RouteStop = {
  city: City;
  /** Qué tanto del viaje lleva al pasar por aquí: 0 en el origen, 1 en el destino. */
  t: number;
};

/** Los pueblos del camino, en orden, del origen al destino (los dos incluidos). */
export function routeStops(originSlug: string, destinationSlug: string, route?: string | null): RouteStop[] {
  const from = getCity(originSlug);
  const to = getCity(destinationSlug);
  if (!from || !to || from.slug === to.slug) return [];
  const path = decodePath(route);
  const stops = path.length >= 2 ? roadStops(path, from, to) : straightStops(from, to);
  return [{ city: from, t: 0 }, ...stops, { city: to, t: 1 }];
}

/** Cuántos pueblos salen entre el origen y el destino en un viaje de `km`. */
function stopCount(km: number): number {
  return Math.min(ROUTE_MAX_STOPS, Math.max(0, Math.round(km / ROUTE_STEP_KM) - 1));
}

/**
 * Los pueblos por donde pasa la carretera, todos (Yohany, 22 de octubre de
 * 2026). Si son demasiados, uno cerca de cada punto del camino que toca: un
 * pueblo de cruce si hay, y si no el que quede más pegado a la carretera.
 */
function roadStops(path: Point[], from: City, to: City): RouteStop[] {
  const km = pathKm(path);
  if (km === 0) return [];

  // Solo se miran los municipios dentro del rectángulo de la ruta.
  const pad = 0.1;
  const lats = path.map((p) => p.lat);
  const lngs = path.map((p) => p.lng);
  const [minLat, maxLat] = [Math.min(...lats) - pad, Math.max(...lats) + pad];
  const [minLng, maxLng] = [Math.min(...lngs) - pad, Math.max(...lngs) + pad];
  const onRoad: { city: City; along: number; offKm: number }[] = [];
  for (const c of CITIES) {
    if (c.slug === from.slug || c.slug === to.slug) continue;
    if (c.lat < minLat || c.lat > maxLat || c.lng < minLng || c.lng > maxLng) continue;
    const { along, offKm } = projectOnPath(path, c);
    if (offKm <= ROAD_STOP_MAX_OFF_KM && along > 0 && along < km) onRoad.push({ city: c, along, offKm });
  }
  if (onRoad.length <= ROAD_MAX_STOPS) {
    return onRoad.map((c) => ({ city: c.city, t: c.along / km })).sort((a, b) => a.t - b.t);
  }

  const step = km / (ROAD_MAX_STOPS + 1);
  const picked = new Set<string>();
  const stops: RouteStop[] = [];
  for (let i = 1; i <= ROAD_MAX_STOPS; i++) {
    const target = step * i;
    let best: (typeof onRoad)[number] | null = null;
    for (const c of onRoad) {
      if (picked.has(c.city.slug) || Math.abs(c.along - target) > step / 2) continue;
      if (!best || better(c, best)) best = c;
    }
    if (!best) continue;
    picked.add(best.city.slug);
    stops.push({ city: best.city, t: best.along / km });
  }
  return stops.sort((a, b) => a.t - b.t);
}

/** Un pueblo de cruce gana; entre iguales, el más pegado a la carretera. */
function better(a: { city: City; offKm: number }, b: { city: City; offKm: number }): boolean {
  const hubA = HUB_SET.has(a.city.slug);
  const hubB = HUB_SET.has(b.city.slug);
  return hubA !== hubB ? hubA : a.offKm < b.offKm;
}

/** Sin carretera: los municipios más cercanos a la línea recta, uno cada tanto. */
function straightStops(from: City, to: City): RouteStop[] {
  const count = stopCount(haversineKm(from.lat, from.lng, to.lat, to.lng));
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
  return stops.sort((a, b) => a.t - b.t);
}

/** Qué tanto del viaje lleva quien está en `currentSlug`: 0 en el origen, 1 en el destino. */
export function routeProgress(
  originSlug: string,
  destinationSlug: string,
  currentSlug: string,
  route?: string | null,
): number | null {
  const from = getCity(originSlug);
  const to = getCity(destinationSlug);
  const now = getCity(currentSlug);
  if (!from || !to || !now) return null;
  const path = decodePath(route);
  if (path.length < 2) return projectOnSegment(from, to, now).t;
  const km = pathKm(path);
  return km === 0 ? 0 : Math.max(0, Math.min(1, projectOnPath(path, now).along / km));
}

/**
 * Qué tanto más larga que la de antes puede quedar la carretera pasando por un
 * pueblo que él agregó en "¿Por dónde vas?". Más larga, seguro se equivocó de
 * pueblo: queda marcado, pero la carretera no cambia.
 */
export const VIA_MAX_RATIO = 1.5;

/**
 * Si el pueblo que marcó en "¿Por dónde vas?" no queda sobre la carretera
 * guardada (o no hay carretera): entonces va por otro lado y hay que pedirla
 * otra vez pasando por ahí.
 */
export function offRoad(route: string | null | undefined, city: City): boolean {
  const path = decodePath(route);
  return path.length < 2 || projectOnPath(path, city).offKm > ROAD_STOP_MAX_OFF_KM;
}

/** Si la carretera nueva, por el pueblo que agregó, no es mucho más larga que la de antes. */
export function viaFits(before: string | null | undefined, after: string): boolean {
  const old = decodePath(before);
  const next = decodePath(after);
  if (next.length < 2) return false;
  return old.length < 2 || pathKm(next) <= pathKm(old) * VIA_MAX_RATIO;
}

/** Cuánto se puede alejar la línea guardada de la carretera de verdad. */
export const SIMPLIFY_KM = 0.3;
/** Cuántos puntos, como mucho, se guardan. */
export const MAX_POINTS = 600;
/**
 * Una carretera mucho más larga que la línea recta es sospechosa (una isla, o
 * un pueblo sin carretera que el servicio conecta por otro lado): mejor la
 * línea recta.
 */
export const MAX_DETOUR = 3;

/**
 * Saca la carretera de la respuesta de OpenRouteService (`directions.ts`), lista
 * para guardar. Si no se ve bien, null.
 */
export function routeFromGeoJson(json: unknown, from: City, to: City): string | null {
  const coords = (json as { features?: { geometry?: { coordinates?: unknown } }[] })?.features?.[0]?.geometry
    ?.coordinates;
  if (!Array.isArray(coords)) return null;
  const points: Point[] = [];
  for (const c of coords) {
    if (!Array.isArray(c) || typeof c[0] !== "number" || typeof c[1] !== "number") return null;
    points.push({ lat: c[1], lng: c[0] });
  }
  if (points.length < 2) return null;
  const straight = haversineKm(from.lat, from.lng, to.lat, to.lng);
  if (pathKm(points) > Math.max(straight * MAX_DETOUR, straight + 50)) return null;
  let tolerance = SIMPLIFY_KM;
  let simple = simplifyPath(points, tolerance);
  while (simple.length > MAX_POINTS) {
    tolerance *= 2;
    simple = simplifyPath(points, tolerance);
  }
  return encodePath(simple);
}
