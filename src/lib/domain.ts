// Vocabulario compartido del negocio (ver documento de producto, secciones 6-8).

import { getCity } from "./cities";

// No se pregunta el vehículo (Yohany, octubre de 2026): importa qué servicios
// hace, no en qué viaja.
//
// El carro particular, con "Espacio en el baúl" y "Asientos traseros libres",
// salió del MVP y queda para después (ver docs/MVP.md).

/** Origen y destino nunca son el mismo municipio, ni para el cliente ni para el transportista. */
export const SAME_CITY_ERROR = "El origen y el destino deben ser distintos.";
/** El error del botón cuando la ruta no sirve: falta un municipio o son el mismo. */
export const ROUTE_ERROR = "Revise la ruta.";

/**
 * "Cualquier destino": el transportista sale de su municipio y va a donde le
 * pidan. Se guarda en `destination_city` en vez de un municipio. No es vacío
 * porque lo que quedó guardado sin destino, de cuando era opcional, sigue
 * apagado.
 */
export const ANY_DESTINATION = "cualquiera";
export const ANY_DESTINATION_LABEL = "Cualquier destino";
export const ANY_DESTINATION_HINT = "Va a donde le pidan";

/**
 * "Cualquier día": la opción que viene elegida en "¿Qué día?" del cliente
 * (Yohany, 21 de octubre de 2026). Le sirven los transportistas de cualquier
 * día y no se vence: sigue abierta hasta que diga "Ya no necesito este
 * servicio". En la base se guarda con `service_date` vacío.
 */
export const ANY_DAY = "cualquier_dia";
export const ANY_DAY_LABEL = "Cualquier día";

/** El nombre del destino del transportista, o "Cualquier destino". */
export function destinationName(slug: string | null): string | undefined {
  return slug === ANY_DESTINATION ? ANY_DESTINATION_LABEL : getCity(slug ?? "")?.name;
}

/**
 * Los servicios (Yohany, 27 de octubre de 2026, con el diseño de Rumbox): el
 * cliente elige uno en "¿Qué necesita?" y el que viaja marca los que hace en
 * "¿Qué servicios hace?". Solo le salen los clientes que piden uno de esos.
 * Las claves se guardan en la base (`requests.service`, `availabilities.services`).
 */
export const SERVICES = {
  mudanza: { label: "Mudanza", plural: "Mudanzas", hint: "Una habitación o una casa completa." },
  flete: { label: "Flete", plural: "Fletes", hint: "Un mueble, una nevera o unas cajas." },
  encomienda: { label: "Encomienda", plural: "Encomiendas", hint: "Un paquete, un sobre o documentos." },
  encargo: { label: "Encargo", plural: "Encargos", hint: "Que le compren algo y se lo traigan." },
  diligencia: { label: "Diligencia", plural: "Diligencias", hint: "Una vuelta, un trámite, recoger algo." },
} as const;
export type Service = keyof typeof SERVICES;

/**
 * Los servicios válidos de una lista, sin repetir y en el orden de `SERVICES`.
 * Lo guardado antes de los servicios no los tiene: null, que es "hace todo".
 */
export function servicesOf(raw: unknown): Service[] | null {
  if (!Array.isArray(raw)) return null;
  return (Object.keys(SERVICES) as Service[]).filter((s) => raw.includes(s));
}

// No se pregunta el tamaño ni el espacio (Yohany, 28 de octubre de 2026): es
// aproximado y lo hablan por teléfono, como el precio y la ayuda para cargar.
// Filtran los servicios: el que viaja los cambia durante el viaje, y si se
// llena quita mudanzas y fletes. Las columnas se quitaron de la base
// (0022_limpieza.sql).

/**
 * El espacio que guarda el navegador del que viaja (`space` en su viaje): solo
 * sirve para reconocer lo guardado con el carro particular de antes (baúl o
 * asientos), que ya no vale.
 */
export const DRIVER_SPACES = { solo_paquetes: true, carga_parcial: true, medio_camion: true, camion_entero: true } as const;
export type DriverSpace = keyof typeof DRIVER_SPACES;
/** Lo que guardan en el navegador los viajes nuevos. */
export const UNSIZED_SPACE: DriverSpace = "camion_entero";

export function isKey<T extends object>(obj: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
}
