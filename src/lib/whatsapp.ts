/**
 * Normaliza un número de WhatsApp a formato internacional sin "+".
 * Asume Colombia (+57) cuando llega un celular local de 10 dígitos.
 * Devuelve null si el número no parece válido.
 */
export function normalizeWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^3\d{9}$/.test(digits)) return `57${digits}`;
  if (/^573\d{9}$/.test(digits)) return digits;
  // Otros países: aceptamos 10 a 15 dígitos con indicativo.
  if (/^[1-9]\d{9,14}$/.test(digits) && !digits.startsWith("57")) return digits;
  return null;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
