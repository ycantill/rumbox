// Consejos de seguridad y reportes (Yohany, 23 de octubre de 2026). Mudavía no
// maneja plata: los fraudes pasan en la llamada o el WhatsApp, así que lo que
// más ayuda es avisar antes y dejar reportar a quien abusa.

import { PRIVACY_CONTACT } from "./legal";

/** Lo que más se repite en las estafas: pedir plata a nombre de Mudavía. */
export const NO_CHARGE_TIP = "Mudavía no te cobra y nunca te escribe.";

/** Para el cliente, en "Tu solicitud". */
export const CLIENT_TIPS = [
  "No pagues nada antes de ver el carro y a la persona.",
  "Pídele la cédula y la placa, y tómales foto.",
  "Acuerden el precio por WhatsApp y paga al entregar.",
  NO_CHARGE_TIP,
] as const;

/** Para el transportista, debajo de sus datos. */
export const DRIVER_TIPS = [
  "Mira en la app de tu banco que la plata llegó. Un pantallazo no es un pago.",
  "Mira qué llevas. No lleves paquetes cerrados de desconocidos.",
  "Desconfía de citas en lugares solos o de noche, y avísale a alguien de tu familia a dónde vas.",
  NO_CHARGE_TIP,
] as const;

/**
 * Lo que puede reportar el cliente de un transportista. Las claves se guardan
 * en la base (`reports.reason`): no se cambian.
 */
export const CLIENT_REPORT_REASONS = {
  anticipo: "Me pidió plata por adelantado",
  no_llego: "No llegó o no volvió a contestar",
  carga: "Se quedó con mis cosas o me cobró más",
  maltrato: "Me trató mal o me amenazó",
  otro: "Otra cosa",
} as const;

/** Lo que puede reportar el transportista del número que lo llamó. */
export const DRIVER_REPORT_REASONS = {
  pago_falso: "Me mostró un pago que no llegó",
  lugar_raro: "Me citó en un lugar solo o raro",
  ilegal: "Me pidió llevar algo ilegal",
  maltrato: "Me trató mal o me amenazó",
  otro: "Otra cosa",
} as const;

export type ClientReportReason = keyof typeof CLIENT_REPORT_REASONS;
export type DriverReportReason = keyof typeof DRIVER_REPORT_REASONS;

export const REPORT_REASON_ERROR = "Elige qué pasó.";
export const REPORT_THANKS = "Gracias. Lo vamos a revisar.";

/** Si el motivo es uno de los de esa pantalla. Cualquiera puede llamar la acción. */
export function isReportReason(reporter: "cliente" | "transportista", reason: unknown): boolean {
  const reasons = reporter === "cliente" ? CLIENT_REPORT_REASONS : DRIVER_REPORT_REASONS;
  return typeof reason === "string" && Object.hasOwn(reasons, reason);
}

/** Lo que ve un transportista si su número quedó bloqueado por reportes. */
export const BLOCKED_ERROR = `Este número no puede usar Mudavía. Si crees que es un error, escríbenos a ${PRIVACY_CONTACT.email}.`;
