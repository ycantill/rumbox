import { expect, type Page } from "@playwright/test";

/** Escribe parte del nombre y elige el municipio de la lista, como haría una persona. */
export async function elegirMunicipio(page: Page, campo: string, texto: string, municipio: string) {
  await page.getByRole("combobox", { name: campo }).fill(texto);
  await page.getByRole("option", { name: new RegExp(`^${municipio}`) }).first().click();
  await expect(page.getByRole("combobox", { name: campo })).toHaveValue(new RegExp(`^${municipio}`));
}

/** Un número de celular distinto por prueba: el límite es de 3 viajes por número cada hora. */
let siguiente = 0;
export function celular(): string {
  siguiente += 1;
  return `300${String(process.pid % 1000).padStart(3, "0")}${String(siguiente).padStart(4, "0")}`;
}

/** El conductor se pone disponible para un viaje. */
export async function ponerseDisponible(page: Page, viaje: { desde: [string, string]; hasta: [string, string]; servicios: string[]; telefono: string }) {
  await page.goto("/transportista");
  await elegirMunicipio(page, "Está en", ...viaje.desde);
  await elegirMunicipio(page, "Va a", ...viaje.hasta);
  // El checkbox está oculto: se toca la tarjeta con el nombre del servicio.
  for (const servicio of viaje.servicios) await page.getByText(servicio, { exact: true }).click();
  await page.getByRole("textbox", { name: "Su teléfono" }).fill(viaje.telefono);
  await page.getByRole("button", { name: "Ponerme disponible" }).click();
}

/** El cliente pide un servicio. */
export async function pedirServicio(page: Page, pedido: { servicio: string; desde: [string, string]; hasta: [string, string] }) {
  await page.goto("/solicitar");
  await page.getByRole("button", { name: pedido.servicio, exact: true }).click();
  await elegirMunicipio(page, "Desde", ...pedido.desde);
  await elegirMunicipio(page, "Hasta", ...pedido.hasta);
  await page.getByRole("button", { name: "Buscar conductor" }).click();
  await expect(page.getByRole("heading", { name: "Su solicitud" })).toBeVisible();
}
