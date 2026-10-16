// Vocabulario compartido del negocio (ver documento de producto, secciones 6-8).

export const VEHICLE_TYPES = {
  furgon: "Furgón",
  estacas: "Estacas",
  pickup: "Pick-up",
  carro: "Carro particular",
} as const;
export type VehicleType = keyof typeof VEHICLE_TYPES;

/** Espacio que el transportista declara libre. */
export const DRIVER_SPACES = {
  camion_entero: "Camión entero",
  medio_camion: "Medio camión",
  solo_paquetes: "Solo paquetes",
  baul: "Baúl disponible",
  asientos: "Asientos traseros libres",
} as const;
export type DriverSpace = keyof typeof DRIVER_SPACES;

/** Volumen que el cliente necesita mover. */
export const VOLUMES = {
  sobres: { label: "Paquetes pequeños o sobres", hint: "Documentos o envíos ligeros" },
  carga_parcial: { label: "Carga parcial", hint: "Un par de muebles, nevera o cajas grandes" },
  medio_camion: { label: "Medio camión", hint: "Apartaestudio: cama, nevera, lavadora" },
  camion_entero: { label: "Camión entero", hint: "Casa o apartamento de 2+ habitaciones" },
} as const;
export type Volume = keyof typeof VOLUMES;

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

export const TIME_SLOTS = {
  manana: "Mañana (6am - 12m)",
  tarde: "Tarde (12m - 6pm)",
  noche: "Noche (6pm - 10pm)",
  todo_el_dia: "Todo el día",
} as const;
export type TimeSlot = keyof typeof TIME_SLOTS;

/** Capacidad relativa: un espacio sirve para volúmenes de nivel igual o menor. */
export const SPACE_CAPACITY: Record<DriverSpace, number> = {
  camion_entero: 4,
  medio_camion: 3,
  solo_paquetes: 1,
  baul: 1,
  asientos: 1,
};
export const VOLUME_LEVEL: Record<Volume, number> = {
  sobres: 1,
  carga_parcial: 2,
  medio_camion: 3,
  camion_entero: 4,
};

/** Mano de obra que ofrece el transportista, ordenada de menos a más. */
export const LABOR_LEVEL: Record<DriverLabor, number> = { solo_manejo: 0, yo_ayudo: 1, con_ayudante: 2 };
export const LABOR_NEED: Record<ClientLabor, number> = { yo_cargo: 0, conductor: 1, ayudantes: 2 };

export function isKey<T extends object>(obj: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
}
