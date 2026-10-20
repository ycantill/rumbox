// Una cosa a la vez en cada teléfono: o es transportista o pide uno, nunca las
// dos (Yohany, octubre de 2026). La pantalla lo revisa con lo guardado en el
// navegador y el servidor con el número.

import { isStillValid } from "./dates";
import { DRIVER_SPACES, isKey } from "./domain";

/** Si el viaje guardado en el teléfono todavía vale: con destino, un espacio de hoy y sin vencer. */
export function tripIsOn(post: { destination: string | null; date: string; space: string }, today: string): boolean {
  return Boolean(post.destination) && isKey(DRIVER_SPACES, post.space) && isStillValid(post.date, today);
}

/** Si la solicitud guardada en el teléfono todavía vale. */
export function requestIsOpen(request: { date: string }, today: string): boolean {
  return isStillValid(request.date, today);
}

/**
 * La pantalla de lo que el teléfono tiene abierto, para ir directo ahí al abrir
 * Muvia, o null si no tiene nada.
 */
export function activeScreen(
  saved: {
    request: { date: string } | null;
    trip: { destination: string | null; date: string; space: string } | undefined;
  },
  today: string,
): "/solicitar" | "/transportista" | null {
  if (saved.request && requestIsOpen(saved.request, today)) return "/solicitar";
  if (saved.trip && tripIsOn(saved.trip, today)) return "/transportista";
  return null;
}

/** Lo que ve el cliente si su número ya está como transportista. */
export const BUSY_AS_DRIVER_ERROR =
  "Este número está como transportista. Para pedir uno, primero toca “Ya no estoy disponible”.";

/** Lo que ve el transportista si su número tiene una solicitud abierta. */
export const BUSY_AS_CLIENT_ERROR =
  "Este número tiene una solicitud abierta. Ciérrala para poder trabajar como transportista.";
