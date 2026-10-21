// Vocabulario compartido del negocio (ver documento de producto, secciones 6-8).

import { getCity } from "./cities";

// La carga se mide por tamaño de casa, con la misma lista para lo que el
// cliente va a mover y para lo que el transportista puede llevar. No se
// pregunta el vehículo: la columna `vehicle_type` de la base queda para lo
// guardado antes. Las claves vienen de cuando se medía en camiones (`medio_camion`,
// `camion_entero`) y no se cambian porque se guardan en la base.
//
// El carro particular, con "Espacio en el baúl" y "Asientos traseros libres",
// salió del MVP y queda para después (ver docs/MVP.md). Sus claves (`carro`,
// `baul`, `asientos`) siguen permitidas en la base de datos.

/** Origen y destino nunca son el mismo municipio, ni para el cliente ni para el transportista. */
export const SAME_CITY_ERROR = "Elige otro municipio: no puede ser el mismo de salida.";

/**
 * "Cualquier destino": el transportista sale de su municipio y va a donde le
 * pidan. Se guarda en `destination_city` en vez de un municipio. No es vacío
 * porque lo que quedó guardado sin destino, de cuando era opcional, sigue
 * apagado.
 */
export const ANY_DESTINATION = "cualquiera";
export const ANY_DESTINATION_LABEL = "Cualquier destino";
export const ANY_DESTINATION_HINT = "Vas a donde te pidan";

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

/** Lo que el cliente necesita mover. */
export const VOLUMES = {
  sobres: { label: "Paquetes o sobres", hint: "Documentos o envíos pequeños" },
  carga_parcial: { label: "Algunas cosas", hint: "Un mueble, una nevera o unas cajas" },
  medio_camion: { label: "Una habitación o apartaestudio", hint: "Cama, clóset, nevera y lavadora" },
  camion_entero: { label: "Una casa de 2 habitaciones o más", hint: "Casa o apartamento completo" },
} as const;
export type Volume = keyof typeof VOLUMES;

/** Lo que el transportista puede llevar: la misma lista del cliente. */
export const DRIVER_SPACES = {
  solo_paquetes: VOLUMES.sobres,
  carga_parcial: VOLUMES.carga_parcial,
  medio_camion: VOLUMES.medio_camion,
  camion_entero: VOLUMES.camion_entero,
} as const;
export type DriverSpace = keyof typeof DRIVER_SPACES;

/** La etiqueta dentro de una frase: "Puedes llevar una casa de 2 habitaciones o más". */
export function spaceInSentence(space: DriverSpace): string {
  const { label } = DRIVER_SPACES[space];
  return label.charAt(0).toLowerCase() + label.slice(1);
}

// No se pregunta la ayuda para cargar (Yohany, 20 de octubre de 2026): lo
// hablan por teléfono, como el precio. La columna `labor` queda en la base para
// lo guardado antes y lo nuevo la deja vacía.

/** La etiqueta dentro de una frase: "Vas a mover una habitación o apartaestudio". */
export function volumeInSentence(volume: Volume): string {
  const { label } = VOLUMES[volume];
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** Capacidad relativa: un espacio sirve para volúmenes de nivel igual o menor. */
export const SPACE_CAPACITY: Record<DriverSpace, number> = {
  camion_entero: 4,
  medio_camion: 3,
  carga_parcial: 2,
  solo_paquetes: 1,
};
export const VOLUME_LEVEL: Record<Volume, number> = {
  sobres: 1,
  carga_parcial: 2,
  medio_camion: 3,
  camion_entero: 4,
};

/** Si lo que el cliente va a mover cabe en lo que el transportista puede llevar. */
export function spaceFitsVolume(space: DriverSpace, volume: Volume): boolean {
  return SPACE_CAPACITY[space] >= VOLUME_LEVEL[volume];
}

export function isKey<T extends object>(obj: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
}
