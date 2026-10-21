// La ruta por carretera como una línea de puntos: guardarla corta en la base
// (polyline codificada, el formato de Google que usan casi todos los servicios
// de rutas), simplificarla y medir dónde queda un pueblo sobre ella.

export type Point = { lat: number; lng: number };

const KM_PER_DEG_LAT = 110.574;

function kmPerDegLng(lat: number): number {
  return 111.32 * Math.cos((lat * Math.PI) / 180);
}

/** Codifica los puntos con 5 decimales (más o menos un metro). */
export function encodePath(points: readonly Point[]): string {
  let out = "";
  let lastLat = 0;
  let lastLng = 0;
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += encodeNumber(lat - lastLat) + encodeNumber(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return out;
}

function encodeNumber(n: number): string {
  let v = n < 0 ? ~(n << 1) : n << 1;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

/** Lo contrario de `encodePath`. Un texto dañado da una lista vacía. */
export function decodePath(text: string | null | undefined): Point[] {
  if (!text) return [];
  const points: Point[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = (): number | null => {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      if (i >= text.length) return null;
      byte = text.charCodeAt(i++) - 63;
      if (byte < 0 || byte > 63) return null;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < text.length) {
    const dLat = next();
    const dLng = next();
    if (dLat === null || dLng === null) return [];
    lat += dLat;
    lng += dLng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/**
 * Quita los puntos que casi no cambian la forma (Douglas-Peucker): se aleja
 * de la carretera como mucho `toleranceKm`.
 */
export function simplifyPath(points: readonly Point[], toleranceKm: number): Point[] {
  if (points.length <= 2) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let worstKm = toleranceKm;
    for (let k = a + 1; k < b; k++) {
      const d = projectOnSegment(points[a], points[b], points[k]).offKm;
      if (d > worstKm) {
        worst = k;
        worstKm = d;
      }
    }
    if (worst === -1) continue;
    keep[worst] = 1;
    stack.push([a, worst], [worst, b]);
  }
  return points.filter((_, k) => keep[k]);
}

/** Lo que mide la línea de puntos, en km. */
export function pathKm(points: readonly Point[]): number {
  let km = 0;
  for (let k = 1; k < points.length; k++) km += segmentKm(points[k - 1], points[k]);
  return km;
}

function segmentKm(a: Point, b: Point): number {
  const dx = (b.lng - a.lng) * kmPerDegLng((a.lat + b.lat) / 2);
  const dy = (b.lat - a.lat) * KM_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Dónde queda p sobre la ruta: cuántos km de ruta lleva quien pasa por ahí
 * (`along`, negativo si queda detrás del comienzo y más que el largo si queda
 * después del final) y qué tan lejos queda de la carretera (`offKm`).
 */
export function projectOnPath(points: readonly Point[], p: Point): { along: number; offKm: number } {
  if (points.length === 0) return { along: 0, offKm: Infinity };
  if (points.length === 1) return { along: 0, offKm: segmentKm(points[0], p) };
  let best = { along: 0, offKm: Infinity };
  let start = 0;
  const last = points.length - 2;
  for (let k = 0; k <= last; k++) {
    const a = points[k];
    const b = points[k + 1];
    const len = segmentKm(a, b);
    const proj = projectOnSegment(a, b, p);
    if (proj.offKm < best.offKm) {
      // En las puntas no se recorta, para saber qué tan detrás o después queda.
      const f = k === 0 && proj.along < 0 ? proj.along : k === last && proj.along > 1 ? proj.along : proj.t;
      best = { along: start + f * len, offKm: proj.offKm };
    }
    start += len;
  }
  return best;
}

/**
 * Proyecta p sobre el segmento a→b usando una proyección equirectangular local
 * (suficiente para distancias de cientos de km). Devuelve la posición relativa
 * t ∈ [0, 1], la misma sin recortar (`along`: negativa detrás de a, mayor que 1
 * después de b) y la distancia al segmento en km.
 */
export function projectOnSegment(a: Point, b: Point, p: Point): { t: number; along: number; offKm: number } {
  const perLng = kmPerDegLng((a.lat + b.lat) / 2);
  const bx = (b.lng - a.lng) * perLng;
  const by = (b.lat - a.lat) * KM_PER_DEG_LAT;
  const px = (p.lng - a.lng) * perLng;
  const py = (p.lat - a.lat) * KM_PER_DEG_LAT;
  const len2 = bx * bx + by * by;
  const raw = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  const t = Math.max(0, Math.min(1, raw));
  const dx = px - t * bx;
  const dy = py - t * by;
  return { t, along: raw, offKm: Math.sqrt(dx * dx + dy * dy) };
}
