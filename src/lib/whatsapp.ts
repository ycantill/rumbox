/** Número de Colombia sin el 57: celular (empieza por 3) o fijo (empieza por 60). */
const COLOMBIA = /^(3\d{9}|60\d{8})$/;

/**
 * Normaliza un número de teléfono (sirve para llamar y para WhatsApp) a formato
 * internacional sin "+".
 * Asume Colombia (+57) cuando llega un número local de 10 dígitos.
 * Devuelve null si el número no parece válido.
 */
export function normalizeWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (COLOMBIA.test(digits)) return `57${digits}`;
  if (digits.startsWith("57")) return COLOMBIA.test(digits.slice(2)) ? digits : null;
  // Otros países: el indicativo y el número, de 10 a 15 dígitos. Sin "+" pedimos
  // al menos 11 y que no empiece como uno de Colombia, para que un dígito de más
  // o de menos no quede guardado como si fuera de otro país.
  if (raw.trim().startsWith("+")) return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
  if (/^(3|60)/.test(digits)) return null;
  return /^[1-9]\d{10,14}$/.test(digits) ? digits : null;
}

/** "573001234567" → "300 123 4567", para que la persona vea su número como quedó. */
export function formatWhatsApp(phone: string): string {
  const co = phone.match(/^57(\d{3})(\d{3})(\d{4})$/);
  return co ? `${co[1]} ${co[2]} ${co[3]}` : `+${phone}`;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** Enlace para llamar: en el celular abre el marcador con el número. */
export function telLink(phone: string): string {
  return `tel:+${phone}`;
}
