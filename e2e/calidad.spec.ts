import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { celular, pedirServicio, ponerseDisponible } from "./helpers";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const ruta of ["/", "/solicitar", "/transportista", "/ayuda", "/privacidad", "/terminos"]) {
  test(`${ruta} no tiene errores de accesibilidad (WCAG 2.2 AA)`, async ({ page }) => {
    await page.goto(ruta);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}

test("las pantallas con resultados tampoco tienen errores de accesibilidad", async ({ browser }) => {
  const conductor = await (await browser.newContext()).newPage();
  await ponerseDisponible(conductor, { desde: ["Ibagu", "Ibagué"], hasta: ["Girard", "Girardot"], servicios: ["Mudanzas"], telefono: celular() });
  await expect(conductor.getByRole("heading", { name: "Usted está disponible" })).toBeVisible();
  const enConductor = await new AxeBuilder({ page: conductor }).withTags(WCAG).analyze();
  expect(enConductor.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  const cliente = await (await browser.newContext()).newPage();
  await pedirServicio(cliente, { servicio: "Mudanza", desde: ["Ibagu", "Ibagué"], hasta: ["Girard", "Girardot"] });
  await expect(cliente.getByRole("article")).toHaveCount(1);
  const enCliente = await new AxeBuilder({ page: cliente }).withTags(WCAG).analyze();
  expect(enCliente.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("ninguna pantalla tiene scroll horizontal en un celular de 360 px", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 740 } })).newPage();
  for (const ruta of ["/", "/solicitar", "/transportista", "/ayuda"]) {
    await page.goto(ruta);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho, ruta).toBeLessThanOrEqual(360);
  }
});
