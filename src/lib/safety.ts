// Consejos de seguridad (Yohany, 23 de octubre de 2026). Mudavía no maneja
// plata: los fraudes pasan en la llamada o el WhatsApp, así que lo que más
// ayuda es avisar antes.

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
