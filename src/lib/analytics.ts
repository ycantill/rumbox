// Analíticas propias: qué se cuenta y cómo se revisa lo que llega del
// navegador. No se guarda nada de la persona (ver 0010_analiticas.sql).

export const PAGES = ["inicio", "solicitar", "transportista", "privacidad"] as const;
export type Page = (typeof PAGES)[number];

export type AnalyticsEvent =
  | { kind: "visita"; page: Page; returning: boolean }
  | { kind: "whatsapp" | "llamada"; availabilityId: string };

/** Lo que se guarda en la tabla `events`. */
export type EventRow = {
  kind: AnalyticsEvent["kind"];
  page: Page | null;
  returning_visitor: boolean | null;
  availability_id: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Convierte lo que manda el navegador en una fila, o null si no es un evento
 * conocido. Cualquiera puede llamar la acción, así que no se confía en nada.
 */
export function eventRow(input: unknown): EventRow | null {
  if (typeof input !== "object" || input === null) return null;
  const e = input as Record<string, unknown>;
  if (e.kind === "visita") {
    if (!PAGES.includes(e.page as Page) || typeof e.returning !== "boolean") return null;
    return { kind: "visita", page: e.page as Page, returning_visitor: e.returning, availability_id: null };
  }
  if (e.kind === "whatsapp" || e.kind === "llamada") {
    if (typeof e.availabilityId !== "string" || !UUID.test(e.availabilityId)) return null;
    return { kind: e.kind, page: null, returning_visitor: null, availability_id: e.availabilityId };
  }
  return null;
}
