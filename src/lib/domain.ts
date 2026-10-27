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

/**
 * Solo la mudanza pregunta "¿Qué tan grande?" (Yohany, 27 de octubre de 2026,
 * con el prototipo de Rumbox; antes también el flete).
 */
export function serviceHasSize(service: Service): boolean {
  return service === "mudanza";
}

/**
 * "¿Qué tan grande?" de la mudanza: dos opciones, con las claves de siempre y
 * los mismos textos del espacio del que viaja. Los demás servicios no
 * preguntan el tamaño: se guardan como sobres y paquetes (`UNSIZED_VOLUME`),
 * así le salen a cualquiera que haga ese servicio.
 */
export const CLIENT_SIZES = {
  medio_camion: { label: "Una habitación", hint: "Cama, clóset, nevera y lavadora", short: "1 habitación" },
  camion_entero: { label: "Una casa", hint: "Trasteo de 2 habitaciones o más", short: "casa" },
} as const;
export type ClientSize = keyof typeof CLIENT_SIZES;
export const UNSIZED_VOLUME: Volume = "sobres";

/** Lo que el cliente necesita mover, por tamaño. Es la misma lista del transportista. */
export const VOLUMES = {
  sobres: { label: "Sobres y paquetes", hint: "Documentos, un celular, una caja pequeña" },
  carga_parcial: { label: "Algunas cosas", hint: "Unas cajas, una maleta, un televisor" },
  medio_camion: { label: "Una habitación", hint: "Cama, clóset, nevera y lavadora" },
  camion_entero: { label: "Una casa", hint: "Trasteo de 2 habitaciones o más" },
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

/**
 * "¿Cuánto espacio tiene?" del que viaja: solo si hace mudanzas, con las dos
 * opciones de la mudanza (Yohany, 27 de octubre de 2026, con el prototipo).
 */
export const MOVING_SPACES = {
  medio_camion: DRIVER_SPACES.medio_camion,
  camion_entero: DRIVER_SPACES.camion_entero,
} as const;
export type MovingSpace = keyof typeof MOVING_SPACES;

/**
 * El espacio que se guarda según los servicios. Si hace mudanzas, el que eligió.
 * Si no, no se le pregunta: los demás servicios se guardan como sobres y
 * paquetes, así que cualquier espacio les sirve, y este solo da el texto de su
 * tarjeta ("Tiene espacio para algunas cosas" si hace fletes).
 */
export function spaceForServices(services: readonly Service[], chosen: string): DriverSpace | null {
  if (services.includes("mudanza")) return isKey(MOVING_SPACES, chosen) ? chosen : null;
  return services.includes("flete") ? "carga_parcial" : "solo_paquetes";
}

/** Dentro de una frase: "Tiene espacio para una casa entera". */
const SPACE_IN_SENTENCE: Record<DriverSpace, string> = {
  solo_paquetes: "sobres y paquetes",
  carga_parcial: "algunas cosas",
  medio_camion: "una habitación",
  camion_entero: "una casa entera",
};
export function spaceInSentence(space: DriverSpace): string {
  return SPACE_IN_SENTENCE[space];
}

// No se pregunta la ayuda para cargar (Yohany, 20 de octubre de 2026): lo
// hablan por teléfono, como el precio. La columna `labor` queda en la base para
// lo guardado antes y lo nuevo la deja vacía.

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
