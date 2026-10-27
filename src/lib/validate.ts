// Lo que falta en los formularios. Lo revisan el navegador, antes de mandar
// (así el error sale aunque no haya señal), y el servidor, con los mismos textos.

import { getCity } from "./cities";
import { addDays } from "./dates";
import {
  ANY_DAY,
  ANY_DESTINATION,
  CLIENT_SIZES,
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  SERVICES,
  isKey,
  serviceHasSize,
  servicesOf,
} from "./domain";
import { normalizeWhatsApp } from "./whatsapp";

type Trip = {
  origin: string;
  destination: string;
  date: string;
};

/** El primer dato que le falta al transportista, o null si está todo. */
export function driverInputError(
  input: Trip & { services: readonly string[]; space: string; whatsapp: string },
  today: string,
): string | null {
  if (!getCity(input.origin)) return "Elija el municipio donde está.";
  if (input.destination !== ANY_DESTINATION && !getCity(input.destination)) return "Elija hacia dónde va.";
  if (input.destination === input.origin) return SAME_CITY_ERROR;
  if (!isValidServiceDate(input.date, today)) return "Elija un día de hoy en adelante.";
  if (!servicesOf(input.services)?.length) return "Elija qué servicios hace.";
  if (!isKey(DRIVER_SPACES, input.space)) return "Elija cuánto espacio tiene.";
  if (!normalizeWhatsApp(input.whatsapp ?? "")) return "Revise el número de teléfono.";
  return null;
}

/**
 * El primer dato que le falta a la solicitud del cliente, o null si está todo.
 * No se le pide teléfono (Yohany, 23 de octubre de 2026): es él quien llama.
 */
export function requestInputError(input: Trip & { service: string; volume: string }, today: string): string | null {
  // En el orden del formulario: qué necesita, qué tan grande, la ruta y el día.
  if (!isKey(SERVICES, input.service)) return "Elija qué necesita.";
  // Solo la mudanza y el flete preguntan el tamaño.
  if (serviceHasSize(input.service) && !isKey(CLIENT_SIZES, input.volume)) return "Elija qué tan grande es.";
  if (!getCity(input.origin)) return "Elija desde dónde.";
  if (!getCity(input.destination)) return "Elija hacia dónde.";
  if (input.destination === input.origin) return SAME_CITY_ERROR;
  // El cliente puede dejar "Cualquier día"; el transportista siempre dice qué día viaja.
  if (input.date !== ANY_DAY && !isValidServiceDate(input.date, today)) return "Elija un día de hoy en adelante.";
  return null;
}

/** Fecha YYYY-MM-DD entre hoy (hora Colombia) y 90 días adelante. */
export function isValidServiceDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  return date >= today && date <= addDays(today, 90);
}
