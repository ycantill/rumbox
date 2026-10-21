// Lo que falta en los formularios. Lo revisan el navegador, antes de mandar
// (así el error sale aunque no haya señal), y el servidor, con los mismos textos.

import { getCity } from "./cities";
import { addDays } from "./dates";
import { ANY_DAY, ANY_DESTINATION, DRIVER_SPACES, SAME_CITY_ERROR, VOLUMES, isKey } from "./domain";
import { normalizeWhatsApp } from "./whatsapp";

type Trip = {
  origin: string;
  destination: string;
  date: string;
  whatsapp: string;
};

/** El primer dato que le falta al transportista, o null si está todo. */
export function driverInputError(input: Trip & { space: string }, today: string): string | null {
  if (!getCity(input.origin)) return "Elige la ciudad donde estás.";
  if (input.destination !== ANY_DESTINATION && !getCity(input.destination)) return "Elige hacia dónde vas.";
  if (input.destination === input.origin) return SAME_CITY_ERROR;
  if (!isValidServiceDate(input.date, today)) return "Elige un día de hoy en adelante.";
  if (!isKey(DRIVER_SPACES, input.space)) return "Elige cuánto puedes llevar.";
  if (!normalizeWhatsApp(input.whatsapp ?? "")) return "Revisa el número de teléfono.";
  return null;
}

/** El primer dato que le falta a la solicitud del cliente, o null si está todo. */
export function requestInputError(input: Trip & { volume: string }, today: string): string | null {
  if (!getCity(input.origin)) return "Elige desde dónde.";
  if (!getCity(input.destination)) return "Elige hacia dónde.";
  if (input.destination === input.origin) return SAME_CITY_ERROR;
  // El cliente puede dejar "Cualquier día"; el transportista siempre dice qué día viaja.
  if (input.date !== ANY_DAY && !isValidServiceDate(input.date, today)) return "Elige un día de hoy en adelante.";
  if (!isKey(VOLUMES, input.volume)) return "Elige qué vas a mover.";
  if (!normalizeWhatsApp(input.whatsapp ?? "")) return "Revisa el número de teléfono.";
  return null;
}

/** Fecha YYYY-MM-DD entre hoy (hora Colombia) y 90 días adelante. */
export function isValidServiceDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  return date >= today && date <= addDays(today, 90);
}
