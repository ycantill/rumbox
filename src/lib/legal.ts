// Quién responde por los datos de las personas (Ley 1581 de 2012 y Decreto 1377
// de 2013). Sale en el aviso de privacidad y en /privacidad.
//
// OJO: el correo y el teléfono son de prueba, solo para el demo (Yohany,
// octubre de 2026). Antes de abrir la app al público hay que poner los de
// verdad, con el nombre y la dirección del responsable (docs/pendientes.md).

export const PRIVACY_CONTACT = {
  name: "Mudavía",
  email: "ayuda@mudavia.co",
  phone: "300 111 2233",
} as const;

/** Desde cuándo vale la política. Cámbiala si cambia el texto. */
export const PRIVACY_UPDATED = "20 de octubre de 2026";
