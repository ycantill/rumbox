/** "2026-10-18" → "sábado 18 de octubre". */
export function formatDay(date: string): string {
  const parts = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === type)?.value;
  return `${part("weekday")} ${part("day")} de ${part("month")}`;
}

/** "hoy", "mañana" o "el sábado 18 de octubre", para armar frases. */
export function whenText(date: string, today: string, tomorrow: string): string {
  if (date === today) return "hoy";
  if (date === tomorrow) return "mañana";
  return `el ${formatDay(date)}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "2026-10-18" más n días, en YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Una solicitud o disponibilidad vale el día del servicio y 24 horas más: una
 * para mañana se vence pasado mañana. Después se apaga sola.
 */
export function isStillValid(serviceDate: string, today: string): boolean {
  // Lo guardado en el teléfono por una versión vieja puede no traer la fecha.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate ?? "")) return false;
  return addDays(serviceDate, 1) >= today;
}
