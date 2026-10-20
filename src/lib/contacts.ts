// "Te buscaron": los clientes que tocaron "Escribir por WhatsApp" o "Llamar"
// en la tarjeta del transportista (Yohany, 20 de octubre de 2026). El
// transportista ve su solicitud y los dos últimos números de su teléfono, para
// reconocerlo cuando le escriba, pero nunca el número: un toque no quiere
// decir que de verdad escribió. Sigue siendo el cliente quien contacta.

import { VOLUMES, isKey, type ClientLabor, type Volume } from "./domain";

/** Lo que el transportista contesta de cada cliente. */
export const CONTACT_ANSWERS = ["lo_llevo", "no_lo_llevo"] as const;
export type ContactAnswer = (typeof CONTACT_ANSWERS)[number];

export function isContactAnswer(value: unknown): value is ContactAnswer {
  return CONTACT_ANSWERS.includes(value as ContactAnswer);
}

/** La ayuda que pidió el cliente, dicha al transportista. */
export const CLIENT_LABOR_FOR_DRIVER: Record<ClientLabor, string> = {
  yo_cargo: "El cliente carga",
  conductor: "Necesita que ayudes a cargar",
  ayudantes: "Necesita ayudantes extra para cargar",
};

/** Los dos últimos números del teléfono, o null si ya se borró o no hay. */
export function phoneEnding(whatsapp: string | null): string | null {
  const digits = (whatsapp ?? "").replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(-2) : null;
}

/** Qué va a mover y la ayuda que pide, en una línea: "Algunas cosas · El cliente carga". */
export function loadSummary(volume: Volume, labor: ClientLabor): string {
  const what = isKey(VOLUMES, volume) ? VOLUMES[volume].label : "";
  // Con paquetes o sobres no se pregunta la ayuda para cargar.
  const help = volume !== "sobres" && isKey(CLIENT_LABOR_FOR_DRIVER, labor) ? CLIENT_LABOR_FOR_DRIVER[labor] : "";
  return [what, help].filter(Boolean).join(" · ");
}
