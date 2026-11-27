import { test, expect } from "@playwright/test";
import { celular, pedirServicio, ponerseDisponible } from "./helpers";

// Cada prueba usa municipios distintos: así no ve los conductores de las otras,
// aunque corran en paralelo contra la misma base.

test("el cliente encuentra al conductor que va para su destino y lo contacta", async ({ browser }) => {
  const telefono = celular();
  const conductor = await (await browser.newContext()).newPage();
  await ponerseDisponible(conductor, {
    desde: ["Barranq", "Barranquilla"],
    hasta: ["Santa Mar", "Santa Marta"],
    servicios: ["Fletes"],
    telefono,
  });
  await expect(conductor.getByRole("heading", { name: "Usted está disponible" })).toBeVisible();
  await expect(conductor.getByRole("main")).toContainText(/Barranquilla\W*a Santa Marta/);

  const cliente = await (await browser.newContext()).newPage();
  await pedirServicio(cliente, { servicio: "Flete", desde: ["Barranq", "Barranquilla"], hasta: ["Santa Mar", "Santa Marta"] });
  await expect(cliente.getByRole("heading", { name: "1 conductor va para allá" })).toBeVisible();

  const tarjeta = cliente.getByRole("article");
  await expect(tarjeta).toContainText("va a Santa Marta");
  // El contacto es directo: WhatsApp con un mensaje listo y llamada al número del conductor.
  await expect(tarjeta.getByRole("link", { name: "Escribir por WhatsApp" })).toHaveAttribute("href", new RegExp(`^https://wa\\.me/57${telefono}\\?text=`));
  await expect(tarjeta.getByRole("link", { name: "Llamar" })).toHaveAttribute("href", `tel:+57${telefono}`);
});

test("al conductor que no hace el servicio pedido no lo ve el cliente", async ({ browser }) => {
  const conductor = await (await browser.newContext()).newPage();
  await ponerseDisponible(conductor, {
    desde: ["Cartagen", "Cartagena"],
    hasta: ["Sincelej", "Sincelejo"],
    servicios: ["Encomiendas"],
    telefono: celular(),
  });
  await expect(conductor.getByRole("heading", { name: "Usted está disponible" })).toBeVisible();

  const cliente = await (await browser.newContext()).newPage();
  await pedirServicio(cliente, { servicio: "Mudanza", desde: ["Cartagen", "Cartagena"], hasta: ["Sincelej", "Sincelejo"] });
  await expect(cliente.getByRole("article")).toHaveCount(0);
  await expect(cliente.getByText(/Su solicitud quedó guardada/)).toBeVisible();
});

test("cuando el conductor deja de estar disponible, el cliente ya no lo ve", async ({ browser }) => {
  const conductor = await (await browser.newContext()).newPage();
  await ponerseDisponible(conductor, {
    desde: ["Pereir", "Pereira"],
    hasta: ["Manizal", "Manizales"],
    servicios: ["Fletes"],
    telefono: celular(),
  });

  const cliente = await (await browser.newContext()).newPage();
  await pedirServicio(cliente, { servicio: "Flete", desde: ["Pereir", "Pereira"], hasta: ["Manizal", "Manizales"] });
  await expect(cliente.getByRole("article")).toHaveCount(1);

  await conductor.getByRole("button", { name: "Ya no estoy disponible" }).click();
  await conductor.getByRole("button", { name: "Sí, ya no estoy disponible" }).click();
  await expect(conductor.getByText("Ya no aparece en las búsquedas. Buen viaje.")).toBeVisible();

  // La solicitud queda guardada en el navegador del cliente: al volver, la lista está al día.
  await cliente.reload();
  await expect(cliente.getByRole("heading", { name: "Su solicitud" })).toBeVisible();
  await expect(cliente.getByRole("article")).toHaveCount(0);
});

test("el servidor rechaza un teléfono que no es un celular de 10 dígitos", async ({ page }) => {
  await ponerseDisponible(page, {
    desde: ["Medell", "Medellín"],
    hasta: ["Rioneg", "Rionegro"],
    servicios: ["Fletes"],
    telefono: "12345",
  });
  await expect(page.getByText("Escriba su número de 10 dígitos.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usted está disponible" })).toHaveCount(0);
});

test("un mismo número no puede ponerse disponible más de 3 veces en una hora", async ({ browser }) => {
  const telefono = celular();
  const viaje = { desde: ["Tunj", "Tunja"] as [string, string], hasta: ["Duitam", "Duitama"] as [string, string], servicios: ["Fletes"], telefono };
  for (let i = 0; i < 3; i++) {
    const page = await (await browser.newContext()).newPage();
    await ponerseDisponible(page, viaje);
    await expect(page.getByRole("heading", { name: "Usted está disponible" })).toBeVisible();
  }
  const cuarta = await (await browser.newContext()).newPage();
  await ponerseDisponible(cuarta, viaje);
  await expect(cuarta.getByText("Ya envió sus datos muchas veces seguidas. Espere un rato e intente otra vez.")).toBeVisible();
});
