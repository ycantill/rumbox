import { getCity, type City } from "./cities";
import { routeProgress, type RouteStop } from "./route";

/** Lo que hace falta para dibujar "¿Por dónde va?": dónde va y qué ya quedó atrás. */
export type RouteDrawing = {
  /** La posición del pueblo donde va, o -1 si no está entre las paradas de la ruta. */
  hereIndex: number;
  /** El pueblo donde va si no está en la ruta: se dibuja aparte, en su lugar del camino. */
  offRoute: City | null;
  /** Antes de qué parada se dibuja `offRoute` (`stops.length` si va al final); -1 si no hay. */
  offRouteAt: number;
  /** Las paradas con posición menor que esta ya quedaron atrás. */
  passedBefore: number;
};

/**
 * Ubica en el dibujo de la ruta el pueblo por donde va el conductor. Si el
 * pueblo no está entre las paradas (la ruta no pudo pasar por ahí), se pone
 * entre las paradas según qué tanto del viaje lleva.
 */
export function routeDrawing(
  stops: RouteStop[],
  trip: { origin: string; destination: string; route?: string | null },
  currentSlug: string,
): RouteDrawing {
  const here = getCity(currentSlug);
  const hereIndex = here ? stops.findIndex((s) => s.city.slug === here.slug) : -1;
  const offRoute = here && hereIndex === -1 ? here : null;
  let offRouteAt = -1;
  if (offRoute) {
    const progress = routeProgress(trip.origin, trip.destination, offRoute.slug, trip.route) ?? 0;
    const next = stops.findIndex((s) => s.t > progress);
    offRouteAt = next === -1 ? stops.length : next;
  }
  return { hereIndex, offRoute, offRouteAt, passedBefore: hereIndex !== -1 ? hereIndex : offRouteAt };
}
