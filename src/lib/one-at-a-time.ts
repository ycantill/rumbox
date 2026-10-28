// Una cosa a la vez en cada teléfono: o es transportista o pide uno, nunca las
// dos (Yohany, octubre de 2026). Lo revisa la pantalla con lo guardado en el
// navegador: el cliente ya no da su número (Yohany, 23 de octubre de 2026).

import { isStillValid } from "./dates";
import { DRIVER_SPACES, isKey } from "./domain";

/**
 * Si el viaje guardado en el teléfono todavía vale: con destino y sin el
 * carro particular de antes. No se vence (Yohany, 21 de octubre de 2026).
 */
export function tripIsOn(post: { destination: string | null; space: string }): boolean {
  return Boolean(post.destination) && isKey(DRIVER_SPACES, post.space);
}

/** Si la solicitud guardada en el teléfono todavía vale. */
export function requestIsOpen(request: { date: string }, today: string): boolean {
  return isStillValid(request.date, today);
}

/**
 * La pantalla de lo que el teléfono tiene abierto, para ir directo ahí al abrir
 * Rumbox, o null si no tiene nada.
 */
export function activeScreen(
  saved: {
    request: { date: string } | null;
    trip: { destination: string | null; space: string } | undefined;
  },
  today: string,
): "/solicitar" | "/transportista" | null {
  if (saved.request && requestIsOpen(saved.request, today)) return "/solicitar";
  if (saved.trip && tripIsOn(saved.trip)) return "/transportista";
  return null;
}
