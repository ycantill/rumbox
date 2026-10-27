// Consejos de seguridad (Yohany, 23 de octubre de 2026). Rumbox no maneja
// plata: los fraudes pasan en la llamada o el WhatsApp, así que lo que más
// ayuda es avisar antes. Con el diseño de Rumbox, en trato de usted.

/** Lo que más se repite en las estafas: pedir plata a nombre de Rumbox. */
export const NO_CHARGE_TIP = "Rumbox nunca le cobra ni le escribe.";

/** Para el cliente, en la ventana antes de escribir o llamar. */
export const CLIENT_TIPS = [
  "No pague nada antes de ver el carro y a la persona.",
  "Pídale la cédula y la placa, y tómeles foto.",
  "Acuerden el precio por WhatsApp y pague al entregar.",
  NO_CHARGE_TIP,
] as const;

/** Para el transportista, en "Para cuidarse", debajo de sus datos. */
export const DRIVER_TIPS = [
  "Revise en la app de su banco que la plata llegó. Un pantallazo no es un pago.",
  "Revise lo que lleva. No cargue paquetes cerrados de desconocidos.",
  "Desconfíe de citas en lugares solos o de noche, y avísele a su familia a dónde va.",
] as const;
