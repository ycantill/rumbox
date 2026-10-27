// Motor de emparejamiento (documento de producto, sección 8).
//
// En el MVP el transportista siempre va de viaje (Modo Ruta): dice de dónde
// sale, hacia dónde va y desde qué día. No se vence: atiende solicitudes de
// ese día o de después, y las de "Cualquier día", cuyo origen y destino quedan
// cerca de su carretera y en el mismo sentido de viaje. Si eligió "Cualquier
// destino", atiende las que salen de su municipio o de uno cercano, vayan a
// donde vayan. No le salen los clientes que quedaron atrás de donde sale o,
// si ya marcó por dónde va, de por dónde va. No hay jornadas. Las rutas que
// se repiten (diarias o semanales) son una mejora futura para después del MVP.

import { getCity, haversineKm } from "./cities";
import { decodePath, projectOnPath, projectOnSegment, type Point } from "./path";
import {
  ANY_DESTINATION,
  spaceFitsVolume,
  type DriverSpace,
  type Service,
  type Volume,
} from "./domain";

/**
 * Qué tan lejos de la carretera puede quedar el pueblo del cliente. También es
 * lo cerca que tiene que salir el cliente con "Cualquier destino".
 */
export const CORRIDOR_ROAD_TOLERANCE_KM = 35;

/**
 * Sin la carretera (si el servicio de rutas no respondió, o es de antes), el
 * corredor es la línea recta. Las carreteras se alejan más de la línea recta
 * en trayectos largos, así que la tolerancia crece con la longitud del viaje.
 */
export const CORRIDOR_MIN_TOLERANCE_KM = CORRIDOR_ROAD_TOLERANCE_KM;
export const CORRIDOR_TOLERANCE_RATIO = 0.25;

/**
 * Cuánto puede haber quedado atrás el pueblo del cliente y todavía servirle,
 * de donde sale o de por dónde va. Por dónde va se guarda como el municipio
 * más cercano, que puede quedar un poco adelante de él.
 */
export const BEHIND_TOLERANCE_KM = 20;

export type AvailabilityLike = {
  origin_city: string;
  destination_city: string;
  service_date: string; // YYYY-MM-DD: desde qué día viaja
  space: DriverSpace;
  /** El municipio por donde va, si ya lo marcó. */
  current_city?: string | null;
  /** La carretera de su viaje (`encodePath`), si se pudo calcular. */
  route?: string | null;
  /** Los servicios que hace. Lo guardado antes de los servicios no los tiene: hace todos. */
  services?: readonly string[] | null;
};

export type RequestLike = {
  origin_city: string;
  destination_city: string;
  /** El día del viaje, o null si es "Cualquier día". */
  service_date: string | null;
  volume: Volume;
  /** Lo que necesita. Las solicitudes de antes no lo tienen: le sirve cualquiera. */
  service?: Service | null;
};

/** Si el servicio que pide el cliente le sirve al transportista en su viaje. */
export function matchesTrip(a: AvailabilityLike, r: RequestLike): boolean {
  // El transportista viaja desde su día en adelante, hasta que se apaga
  // (Yohany, 21 de octubre de 2026). Con "Cualquier día" le sirve cualquiera.
  if (r.service_date !== null && a.service_date > r.service_date) return false;
  if (!spaceFitsVolume(a.space, r.volume)) return false;
  // Solo le salen los clientes que piden uno de los servicios que hace (Yohany,
  // 27 de octubre de 2026).
  if (r.service && a.services && !a.services.includes(r.service)) return false;
  // Origen y destino no pueden ser el mismo municipio. Las solicitudes nuevas
  // ya no lo permiten; esto deja fuera las que quedaron guardadas de antes.
  if (r.origin_city === r.destination_city) return false;
  const driverFrom = getCity(a.origin_city);
  const driverNow = getCity(a.current_city);
  // Va a donde le pidan: basta con que el cliente salga de donde está (el
  // municipio por donde va o, si no lo ha marcado, el de donde salió) o de uno
  // cercano, con la misma tolerancia mínima del corredor.
  if (a.destination_city === ANY_DESTINATION) {
    const here = driverNow ?? driverFrom;
    const from = getCity(r.origin_city);
    if (!here || !from || !getCity(r.destination_city)) return false;
    return haversineKm(here.lat, here.lng, from.lat, from.lng) <= CORRIDOR_MIN_TOLERANCE_KM;
  }

  const driverTo = getCity(a.destination_city);
  const from = getCity(r.origin_city);
  const to = getCity(r.destination_city);
  if (!driverFrom || !driverTo || !from || !to) return false;

  const corridor = tripCorridor(driverFrom, driverTo, a.route);
  const pFrom = corridor.place(from);
  const pTo = corridor.place(to);
  const onCorridor = pFrom.offKm <= corridor.toleranceKm && pTo.offKm <= corridor.toleranceKm;
  // Mismo sentido: la recogida va antes que la entrega sobre el trayecto. Se
  // mira sin recortar: dos pueblos detrás del origen, o después del destino,
  // también tienen un orden.
  if (!onCorridor || pFrom.alongKm > pTo.alongKm) return false;
  // El pueblo del cliente no puede haber quedado atrás de donde está: el
  // municipio por donde va o, si no lo ha marcado, el de donde sale.
  const here = driverNow ? corridor.place(driverNow).alongKm : 0;
  if (here - pFrom.alongKm > BEHIND_TOLERANCE_KM) return false;
  return true;
}

type Corridor = {
  /** Qué tan lejos del camino puede quedar el pueblo del cliente. */
  toleranceKm: number;
  /** Cuántos km del viaje lleva al pasar por p (sin recortar) y qué tan lejos queda del camino. */
  place: (p: Point) => { alongKm: number; offKm: number };
};

/**
 * El camino del transportista: la carretera que se guardó al ponerse
 * disponible o, si no se pudo calcular (o es de antes), la línea recta.
 */
export function tripCorridor(from: Point, to: Point, route?: string | null): Corridor {
  const path = decodePath(route);
  if (path.length >= 2) {
    return {
      toleranceKm: CORRIDOR_ROAD_TOLERANCE_KM,
      place: (p) => {
        const { along, offKm } = projectOnPath(path, p);
        return { alongKm: along, offKm };
      },
    };
  }
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return {
    toleranceKm: Math.max(CORRIDOR_MIN_TOLERANCE_KM, km * CORRIDOR_TOLERANCE_RATIO),
    place: (p) => {
      const { along, offKm } = projectOnSegment(from, to, p);
      return { alongKm: along * km, offKm };
    },
  };
}

/**
 * Deja una sola fila por clave, la primera que aparece. Las filas deben venir de
 * la más nueva a la más vieja dentro de cada clave, así que queda la última que
 * se guardó. Sirve para no mostrar dos veces al mismo transportista, ni el mismo
 * viaje de un cliente que buscó varias veces.
 */
export function newestBy<T>(rows: readonly T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const k = key(row);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
