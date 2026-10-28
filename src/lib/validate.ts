// Lo que falta en los formularios. Lo revisan el navegador, antes de mandar
// (así el error sale aunque no haya señal), y el servidor, con los mismos textos.

import { getCity } from "./cities";
import { addDays } from "./dates";
import { ANY_DAY, ANY_DESTINATION, ROUTE_ERROR, SERVICES, isKey, servicesOf } from "./domain";
import { normalizeWhatsApp } from "./whatsapp";

type Trip = {
  origin: string;
  destination: string;
  date: string;
};

/** Cuando el que viaja no marca ningún servicio, al ponerse disponible o en el camino. */
export const NO_SERVICES_ERROR = "Elija al menos un servicio.";

/** El primer dato que le falta al transportista, o null si está todo. */
export function driverInputError(
  input: Trip & { services: readonly string[]; whatsapp: string },
  today: string,
): string | null {
  if (!getCity(input.origin)) return ROUTE_ERROR;
  if (input.destination !== ANY_DESTINATION && !getCity(input.destination)) return ROUTE_ERROR;
  if (input.destination === input.origin) return ROUTE_ERROR;
  if (!isValidServiceDate(input.date, today)) return "Elija un día de hoy en adelante.";
  const services = servicesOf(input.services);
  if (!services?.length) return NO_SERVICES_ERROR;
  if (!normalizeWhatsApp(input.whatsapp ?? "")) return "Escriba su número de 10 dígitos.";
  return null;
}

/**
 * El primer dato que le falta a la solicitud del cliente, o null si está todo.
 * No se le pide teléfono (Yohany, 23 de octubre de 2026): es él quien llama.
 */
export function requestInputError(input: Trip & { service: string }, today: string): string | null {
  // En el orden del formulario: qué necesita, la ruta y el día.
  if (!isKey(SERVICES, input.service)) return "Elija qué servicio necesita.";
  if (!getCity(input.origin) || !getCity(input.destination)) return ROUTE_ERROR;
  if (input.destination === input.origin) return ROUTE_ERROR;
  // El cliente puede dejar "Cualquier día"; el transportista siempre dice qué día viaja.
  if (input.date !== ANY_DAY && !isValidServiceDate(input.date, today)) return "Elija un día de hoy en adelante.";
  return null;
}

/** Hasta cuántos días adelante se puede elegir el viaje. */
export const MAX_DAYS_AHEAD = 90;

/** Fecha YYYY-MM-DD entre hoy (hora Colombia) y 90 días adelante. */
export function isValidServiceDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  return date >= today && date <= addDays(today, MAX_DAYS_AHEAD);
}
