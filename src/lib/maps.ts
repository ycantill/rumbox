// "Comienza tu viaje": abre Google Maps con el camino hasta su destino (Yohany,
// 22 de octubre de 2026). Es un enlace, sin llave. No se manda de dónde sale:
// Maps arranca desde donde está el teléfono, así que sirve igual para empezar
// que para seguir después de una parada o de un desvío. Mudavía no se entera
// de nada de lo que pasa en Maps.

import type { City } from "./cities";

/** El nombre que Maps busca: "La Unión, Sucre, Colombia", sin el departamento entre paréntesis. */
export function mapsPlace(city: City): string {
  const name = city.name.replace(/\s*\([^)]*\)$/, "");
  return `${name}, ${city.department}, Colombia`;
}

/** El enlace que abre Google Maps navegando hasta `destination`. */
export function mapsUrl(destination: City): string {
  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&destination=${encodeURIComponent(mapsPlace(destination))}` +
    "&travelmode=driving&dir_action=navigate"
  );
}
