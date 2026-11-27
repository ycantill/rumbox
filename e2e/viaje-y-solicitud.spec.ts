import { test, expect } from "@playwright/test";
import { celular, pedirServicio, ponerseDisponible } from "./helpers";

// Lo que se hace después de ponerse disponible o de pedir: marcar por dónde va,
// cambiar los servicios, cambiar o cerrar la solicitud.

test("el conductor marca por dónde va tocando el pueblo en su ruta", async ({ page }) => {
  await ponerseDisponible(page, { desde: ["Valledup", "Valledupar"], hasta: ["Riohach", "Riohacha"], servicios: ["Fletes"], telefono: celular() });
  const ruta = page.getByRole("list", { name: "Su ruta" });
  await expect(ruta.getByRole("button", { name: /Valledupar.*Usted va aquí/ })).toBeDisabled();

  await ruta.getByRole("button", { name: "Riohacha" }).click();
  await expect(ruta.getByRole("button", { name: /Riohacha.*Usted va aquí/ })).toBeDisabled();
  await expect(ruta.getByRole("button", { name: /Valledupar.*ya pasó/ })).toBeEnabled();

  // Queda guardado en el servidor: al volver a la pantalla sigue marcado.
  await page.reload();
  await expect(page.getByRole("list", { name: "Su ruta" }).getByRole("button", { name: /Riohacha.*Usted va aquí/ })).toBeVisible();
});

test("si el conductor quita un servicio en el camino, deja de salirle a quien lo pide", async ({ browser }) => {
  const conductor = await (await browser.newContext()).newPage();
  await ponerseDisponible(conductor, { desde: ["Montería", "Montería"], hasta: ["Caucasi", "Caucasia"], servicios: ["Mudanzas", "Encomiendas"], telefono: celular() });

  const cliente = await (await browser.newContext()).newPage();
  await pedirServicio(cliente, { servicio: "Mudanza", desde: ["Montería", "Montería"], hasta: ["Caucasi", "Caucasia"] });
  await expect(cliente.getByRole("article")).toHaveCount(1);

  // Se llenó: quita mudanzas y le siguen saliendo las encomiendas.
  const ahora = conductor.getByRole("group", { name: "¿Qué servicios hace ahora?" });
  await ahora.getByText("Mudanzas", { exact: true }).click();
  await expect(ahora.getByRole("checkbox", { name: /Mudanzas/ })).not.toBeChecked();
  await expect(ahora).toBeEnabled();

  await cliente.reload();
  await expect(cliente.getByRole("heading", { name: "Su solicitud" })).toBeVisible();
  await expect(cliente.getByRole("article")).toHaveCount(0);
});

test("el cliente cambia su solicitud y la flecha de atrás lo devuelve sin cambiarla", async ({ page }) => {
  await pedirServicio(page, { servicio: "Encomienda", desde: ["Neiv", "Neiva"], hasta: ["Pitalit", "Pitalito"] });

  await page.getByRole("button", { name: "Cambiar" }).click();
  await expect(page.getByRole("heading", { name: "¿Qué necesita?" })).toBeVisible();
  // El formulario trae lo que había pedido.
  await expect(page.getByRole("combobox", { name: "Desde" })).toHaveValue(/^Neiva/);
  await expect(page.getByRole("button", { name: "Encomienda", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Su solicitud" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "Pitalito" })).toBeVisible();
});

test("el cliente cierra su solicitud y vuelve al inicio con el aviso", async ({ page }) => {
  await pedirServicio(page, { servicio: "Flete", desde: ["Popay", "Popayán"], hasta: ["Pasto", "Pasto"] });
  await page.getByRole("button", { name: "Ya no necesito el servicio" }).click();
  await page.getByRole("button", { name: "Sí, ya no lo necesito" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Listo. Cerramos su solicitud.")).toBeVisible();

  // Al volver a pedir sale el formulario, no la solicitud cerrada.
  await page.goto("/solicitar");
  await expect(page.getByRole("heading", { name: "¿Qué necesita?" })).toBeVisible();
});
