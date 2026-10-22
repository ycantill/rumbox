// "Comienza tu viaje": abre el mapa del teléfono con el camino hasta su destino
// (Yohany, 22 de octubre de 2026). Es un enlace, sin llave. No se manda de
// dónde sale: el mapa arranca desde donde está el teléfono, así que sirve igual
// para empezar que para seguir después de una parada o de un desvío. Mudavía
// no se entera de nada de lo que pasa en el mapa.
//
// En Android abre Google Maps. En iPhone, Mapas de Apple (Yohany, 22 de
// octubre de 2026): viene en todos, y Google Maps sin su app no lo guía.

import type { City } from "./cities";

/** El nombre que busca el mapa: "La Unión, Sucre, Colombia", sin el departamento entre paréntesis. */
export function mapsPlace(city: City): string {
  const name = city.name.replace(/\s*\([^)]*\)$/, "");
  return `${name}, ${city.department}, Colombia`;
}

/**
 * Si es un iPhone o un iPad. El iPad se presenta como un Mac, pero con
 * pantalla táctil.
 */
export function isAppleMobile(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** El enlace que abre el mapa con el camino en carro hasta `destination`. */
export function mapsUrl(destination: City, apple: boolean): string {
  const place = encodeURIComponent(mapsPlace(destination));
  return apple
    ? `https://maps.apple.com/?daddr=${place}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${place}&travelmode=driving&dir_action=navigate`;
}
