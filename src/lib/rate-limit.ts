// Límite de solicitudes del cliente. Sin cuentas, cualquiera podría hacer
// muchas solicitudes seguidas para juntar los teléfonos de los transportistas.

/** La ventana en la que se cuentan las solicitudes. */
export const RATE_WINDOW_MS = 60 * 60 * 1000;

/** Solicitudes por teléfono en la ventana: alcanza para corregir varias veces. */
export const MAX_PER_PHONE = 5;

/**
 * Solicitudes por conexión en la ventana. Es más alto porque en los datos del
 * celular muchas personas salen a internet por la misma IP.
 */
export const MAX_PER_IP = 20;

export const RATE_LIMIT_ERROR = "Ya hiciste muchas solicitudes seguidas. Espera un rato e intenta otra vez.";

export function overLimit(counts: { phone: number; ip: number }): boolean {
  return counts.phone >= MAX_PER_PHONE || counts.ip >= MAX_PER_IP;
}

/** La IP de quien llama. En Vercel la pone Vercel, no el navegador. */
export function clientIp(h: { get(name: string): string | null }): string | null {
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}
