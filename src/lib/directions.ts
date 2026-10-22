import "server-only";
import type { City } from "./cities";
import { routeFromGeoJson } from "./route";

// La carretera del viaje del transportista, de OpenRouteService (gratis con
// llave, datos de OpenStreetMap). Se pide una vez, al ponerse disponible, y se
// guarda. Solo se mandan las coordenadas del centro de los dos municipios,
// nada de la persona. Sin llave, o si el servicio no responde, no hay
// carretera y Mudavía usa la línea recta.

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
/** Lo que espera al servicio: el transportista está esperando su respuesta. */
const TIMEOUT_MS = 5000;

/** La carretera de `from` a `to`, lista para guardar (`encodePath`), o null. */
export async function roadRoute(from: City, to: City): Promise<string | null> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ORS_URL, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/geo+json" },
      body: JSON.stringify({
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
        // El centro del pueblo puede quedar a unas cuadras de la carretera.
        radiuses: [5000, 5000],
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
