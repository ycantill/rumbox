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

/** "2026-10-18" + 6 → "2026-10-24". Acepta días negativos. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Días que hay de una fecha a otra; negativo si la segunda va antes. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** "Se vence hoy", "Se vence mañana" o "Se vence en 3 días", según su último día. */
export function expiresText(lastDay: string, today: string): string {
  const days = daysBetween(today, lastDay);
  if (days <= 0) return "Se vence hoy";
  if (days === 1) return "Se vence mañana";
  return `Se vence en ${days} días`;
}
