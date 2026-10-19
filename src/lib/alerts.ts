// Avisos al cliente cuando aparece un transportista que le sirve: el aviso al
// celular (Web Push, aunque tenga la app cerrada) y el canal de Realtime con el
// que su pantalla se pone al día mientras la tiene abierta.

import { getCity } from "./cities";
import { matchesTrip, type AvailabilityLike, type RequestLike } from "./matching";

/**
 * Canal público de Realtime de un día de viaje. Lo arma igual la migración
 * `0006_avisos.sql`: no se cambia sin cambiar las dos partes.
 */
export function liveTopic(date: string): string {
  return `transportistas-${date}`;
}

/** El evento que manda la base de datos al canal. */
export const LIVE_EVENT = "cambio";

/** Lo que muestra el celular. */
export type AlertMessage = { title: string; body: string; url: string; tag: string };

export type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  request: RequestLike & { id: string };
};

/**
 * A quién avisarle cuando un transportista se pone disponible: los teléfonos
 * cuya solicitud le sirve a su viaje, con el mensaje para cada uno.
 */
export function alertsFor(
  availability: AvailabilityLike,
  rows: SubscriptionRow[],
): { row: SubscriptionRow; message: AlertMessage }[] {
  return rows
    .filter((row) => matchesTrip(availability, row.request))
    .map((row) => ({ row, message: alertMessage(row.request) }));
}

export function alertMessage(r: { id: string; origin_city: string; destination_city: string }): AlertMessage {
  const from = getCity(r.origin_city)?.name ?? "";
  const to = getCity(r.destination_city)?.name ?? "";
  return {
    title: "Apareció un transportista",
    body: `Para tu viaje de ${from} a ${to}. Toca aquí para llamarlo o escribirle.`,
    url: "/solicitar",
    // Varios avisos de la misma solicitud se juntan en uno.
    tag: `solicitud-${r.id}`,
  };
}
