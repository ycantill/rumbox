import "server-only";
import type { City } from "./cities";
import { routeFromGeoJson } from "./route";

// La carretera del viaje del transportista, de OpenRouteService (gratis con
// llave, datos de OpenStreetMap). Se pide una vez, al ponerse disponible, y se
// guarda. Si él dice que va por un pueblo que no queda en ella, se pide otra
// vez pasando por ese pueblo. Solo se mandan las coordenadas del centro de los
// municipios, nada de la persona. Sin llave, o si el servicio no responde, no
// hay carretera y Rumbox usa la línea recta.

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
/** Lo que espera al servicio: el transportista está esperando su respuesta. */
const TIMEOUT_MS = 5000;

/**
 * La carretera más rápida de `from` a `to`, pasando por `via` si lo hay, lista
 * para guardar (`encodePath`). null si no hay llave o el servicio no respondió.
 */
export async function roadRoute(from: City, to: City, via?: City): Promise<string | null> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) return null;
  const points = via ? [from, via, to] : [from, to];
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
