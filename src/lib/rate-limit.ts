// Límites para lo que se guarda sin cuenta. Sin ellos, cualquiera podría hacer
// muchas solicitudes seguidas para juntar los teléfonos de los transportistas,
// o llenar la app de transportistas falsos (con el número de otra persona) que
// les salen a los clientes.

/** La ventana en la que se cuenta lo guardado. */
export const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Cuántas se permiten en la ventana por teléfono y por conexión. Por conexión
 * es más alto porque en los datos del celular muchas personas salen a internet
 * por la misma IP.
 */
export const LIMITS: Record<"requests" | "availabilities", { phone?: number; ip: number }> = {
  /**
   * Solicitudes del cliente: alcanza para corregir varias veces. Solo por
   * conexión, porque al cliente ya no se le pide el teléfono.
   */
  requests: { ip: 20 },
  /** Disponibilidades del transportista: tiene una a la vez. */
  availabilities: { phone: 3, ip: 10 },
};

export type LimitedTable = keyof typeof LIMITS;

export const RATE_LIMIT_ERROR = "Ya hizo muchas solicitudes seguidas. Espere un rato e intente otra vez.";
/** Para el transportista: él no hace solicitudes, y "disponible" no se repite. */
export const DRIVER_RATE_LIMIT_ERROR = "Ya envió sus datos muchas veces seguidas. Espere un rato e intente otra vez.";

export function overLimit(table: LimitedTable, counts: { phone: number; ip: number }): boolean {
  const max = LIMITS[table];
  return (max.phone !== undefined && counts.phone >= max.phone) || counts.ip >= max.ip;
}

/** La IP de quien llama. En Vercel la pone Vercel, no el navegador. */
export function clientIp(h: { get(name: string): string | null }): string | null {
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}
