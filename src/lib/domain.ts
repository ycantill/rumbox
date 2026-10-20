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

export const DRIVER_LABOR = {
  solo_manejo: "Solo manejo (el cliente carga)",
  yo_ayudo: "Yo ayudo a cargar",
  con_ayudante: "Con ayudante extra",
} as const;
export type DriverLabor = keyof typeof DRIVER_LABOR;

export const CLIENT_LABOR = {
  yo_cargo: "No, yo cargo",
  conductor: "Necesito al conductor",
  ayudantes: "Necesito ayudantes extra",
} as const;
export type ClientLabor = keyof typeof CLIENT_LABOR;

/** La ayuda que pidió el cliente, dicha en "Tu solicitud". */
export const CLIENT_LABOR_SUMMARY: Record<ClientLabor, string> = {
  yo_cargo: "Tú cargas",
  conductor: "Necesitas que el conductor ayude a cargar",
  ayudantes: "Necesitas ayudantes extra para cargar",
};

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

/** Mano de obra que ofrece el transportista, ordenada de menos a más. */
export const LABOR_LEVEL: Record<DriverLabor, number> = { solo_manejo: 0, yo_ayudo: 1, con_ayudante: 2 };
export const LABOR_NEED: Record<ClientLabor, number> = { yo_cargo: 0, conductor: 1, ayudantes: 2 };

export function isKey<T extends object>(obj: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
}
