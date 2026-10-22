import "server-only";
import type { City } from "./cities";
import { distinctRoutes, viaCandidates } from "./alternatives";
import { decodePath } from "./path";
import { routeFromGeoJson } from "./route";

// La carretera del viaje del transportista, de OpenRouteService (gratis con
// llave, datos de OpenStreetMap). Se pide una vez, al ponerse disponible, y se
// guarda, con los otros caminos por donde puede ir. Solo se mandan las
// coordenadas del centro de los municipios, nada de la persona. Sin llave, o
// si el servicio no responde, no hay carretera y Mudavía usa la línea recta.

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
/** Lo que espera al servicio: el transportista está esperando su respuesta. */
const TIMEOUT_MS = 5000;

/**
 * Los caminos de `from` a `to`, listos para guardar (`encodePath`): primero el
 * más rápido y después los otros que van por otro lado, pasando por pueblos de
 * cruce que no quedan en el más rápido (`alternatives.ts`). Los otros se piden
 * todos a la vez. Vacío si no hay llave o el servicio no respondió.
 */
export async function roadRoutes(from: City, to: City): Promise<string[]> {
  const fastest = await roadRoute([from, to], from, to);
  if (!fastest) return [];
  const vias = viaCandidates(from, to, decodePath(fastest));
  const others = await Promise.all(vias.map((via) => roadRoute([from, via, to], from, to)));
  return distinctRoutes(fastest, others);
}

/** La carretera que pasa por `points`, o null. */
async function roadRoute(points: City[], from: City, to: City): Promise<string | null> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ORS_URL, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/geo+json" },
      body: JSON.stringify({
        coordinates: points.map((p) => [p.lng, p.lat]),
        // El centro del pueblo puede quedar a unas cuadras de la carretera.
        radiuses: points.map(() => 5000),
        instructions: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`OpenRouteService respondió ${res.status}`);
    return routeFromGeoJson(await res.json(), from, to);
  } catch (err) {
    console.error(err);
    return null;
  }
}
