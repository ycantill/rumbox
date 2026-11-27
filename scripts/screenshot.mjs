// Genera docs/screenshot.png para el README: inicio, la solicitud del cliente
// con un conductor y "Usted está disponible" con el dibujo de la ruta.
// Usa la app compilada y el Supabase local (datos de prueba, nunca producción):
//   npm run db:start && npm run build
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx next start -p 3100   (ver e2e/supabase.ts)
//   npm run screenshot
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const D = mkdtempSync(join(tmpdir(), "rumbox-"));
const salida = new URL("../docs/screenshot.png", import.meta.url).pathname;
const b = await chromium.launch();
const nuevo = async () => (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "es-CO", timezoneId: "America/Bogota" })).newPage();

async function municipio(p, campo, texto, nombre) {
  await p.getByRole("combobox", { name: campo }).fill(texto);
  await p.getByRole("option", { name: new RegExp(`^${nombre}`) }).first().click();
}

// 1. Inicio.
const inicio = await nuevo();
await inicio.goto(BASE + "/");
await inicio.screenshot({ path: join(D, "1.png") });

// 2. Un conductor se pone disponible y marca por dónde va.
const conductor = await nuevo();
await conductor.goto(BASE + "/transportista");
await municipio(conductor, "Está en", "Monter", "Montería");
await municipio(conductor, "Va a", "Cartagen", "Cartagena");
await conductor.getByText("Mudanzas", { exact: true }).click();
await conductor.getByText("Fletes", { exact: true }).click();
await conductor.getByRole("textbox", { name: "Su teléfono" }).fill("3001234567");
await conductor.getByRole("button", { name: "Ponerme disponible" }).click();
const ruta = conductor.getByRole("list", { name: "Su ruta" });
await ruta.getByRole("button").nth(1).click();
await conductor.waitForTimeout(800);
// El cliente sale de un pueblo que el conductor todavía no ha pasado.
const adelante = (await ruta.getByRole("button").nth(2).textContent())?.trim() ?? "Cartagena";
const top = await conductor.evaluate(() => {
  const h = [...document.querySelectorAll("h2")].find((e) => e.textContent?.includes("¿Por dónde va?"));
  return (h?.closest("section")?.getBoundingClientRect().top ?? 0) + window.scrollY - 220;
});
await conductor.screenshot({ path: join(D, "3.png"), fullPage: true, clip: { x: 0, y: Math.max(0, top), width: 390, height: 844 } });

// 3. Un cliente pide un flete en esa ruta y encuentra al conductor.
const cliente = await nuevo();
await cliente.goto(BASE + "/solicitar");
await cliente.getByRole("button", { name: "Flete", exact: true }).click();
await municipio(cliente, "Desde", adelante.slice(0, -1), adelante);
await municipio(cliente, "Hasta", "Cartagen", "Cartagena");
await cliente.getByRole("button", { name: "Buscar conductor" }).click();
await cliente.getByRole("article").first().waitFor();
await cliente.screenshot({ path: join(D, "2.png") });

const img = (n) => "data:image/png;base64," + readFileSync(join(D, `${n}.png`)).toString("base64");
const textos = ["Home: pick a role, no sign-up", "Client: drivers already heading there", "Driver: available, marking the route"];
const html = `<html><body style="margin:0;background:linear-gradient(135deg,#1a3f73,#0f2a50);font-family:system-ui;display:flex;justify-content:center;padding:36px 40px 40px">
<div style="display:flex;gap:34px">${[1, 2, 3].map((n, i) => `<figure style="margin:0;text-align:center;color:#e8eef7;font-size:19px"><img src="${img(n)}" style="width:330px;border-radius:30px;box-shadow:0 18px 40px rgba(0,0,0,.35);border:7px solid #111"><figcaption style="margin-top:14px">${textos[i]}</figcaption></figure>`).join("")}</div></body></html>`;
const p = await b.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1.5 });
await p.setContent(html);
await p.setViewportSize({ width: 1200, height: await p.evaluate(() => document.body.scrollHeight) });
await p.screenshot({ path: salida });
await b.close();
console.log(`Captura en ${salida}`);
