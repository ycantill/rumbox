// Avisos al cliente cuando aparece un transportista que le sirve: el aviso al
// celular (Web Push, aunque tenga la app cerrada) y el canal de Realtime con el
// que su pantalla se pone al día mientras la tiene abierta.

import { getCity } from "./cities";
import { matchesTrip, type AvailabilityLike, type RequestLike } from "./matching";

/**
 * Canal privado de Realtime de un día de viaje: la anon key solo puede
 * escucharlo. Lo arman igual las migraciones `0006_avisos.sql` y
 * `0007_proteger_datos.sql`: no se cambia sin cambiar las dos partes.
 */
export function liveTopic(date: string): string {
  return `transportistas-${date}`;
}

/**
 * El canal que recibe los cambios de transportistas de todos los días
 * (`0015_cualquier_dia_sin_vencer.sql`). Es el que escucha la pantalla del
 * cliente: un transportista le sirve desde su día en adelante.
 */
export const ALL_DAYS_TOPIC = "transportistas-cualquier_dia";

/**
 * Los servicios de avisos de los navegadores (Chrome y Android, Firefox,
 * Safari y iPhone, Edge). El servidor de Muvia les manda los avisos a las
 * direcciones que guarda: solo se aceptan las de estos servicios, para que
 * nadie lo use para mandar mensajes a otra página.
 */
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

export function isPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "") return false;
  return PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
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
    // Las suscripciones guardadas antes de revisar la dirección tampoco se usan.
    .filter((row) => isPushEndpoint(row.endpoint) && matchesTrip(availability, row.request))
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
