import type { DriverSpace, Service } from "@/lib/domain";

/** El viaje en el que el conductor está disponible, guardado en su teléfono. Uno a la vez. */
export type MyPost = {
  id: string;
  editToken: string;
  origin: string;
  // Un municipio o "cualquiera" (Cualquier destino). null en los guardados
  // cuando el destino era opcional.
  destination: string | null;
  date: string; // desde qué día viaja
  /** Los servicios que hace. Los guardados antes de los servicios no los tienen. */
  services?: Service[] | null;
  // Ya no se pregunta (Yohany, 28 de octubre de 2026): solo dice si es del
  // carro particular de antes, que ya no vale.
  space: DriverSpace;
  // El municipio por donde va, si ya lo marcó con la ubicación del teléfono.
  current?: string | null;
  // La carretera de su viaje (`encodePath`), para "¿Por dónde vas?". Sin ella,
  // la línea recta.
  route?: string | null;
  // Si ya tocó "Comienza tu viaje": entonces dice "Continúa tu viaje".
  started?: boolean;
};

/** Lo que se guarda del conductor para la próxima vez. Lo de antes puede traer la ayuda para cargar, que ya no se pregunta. */
export type Profile = { whatsapp: string };
