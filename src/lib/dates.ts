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
