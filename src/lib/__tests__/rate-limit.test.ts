import { describe, expect, it } from "vitest";
import { LIMITS, clientIp, overLimit } from "../rate-limit";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("límite de lo que se guarda", () => {
  const driver = LIMITS.availabilities;
  const client = LIMITS.requests;

  it("transportista: deja pasar por debajo de los dos límites", () => {
    expect(overLimit("availabilities", { phone: driver.phone! - 1, ip: driver.ip - 1 })).toBe(false);
  });

  it("transportista: frena al llegar al límite del teléfono", () => {
    expect(overLimit("availabilities", { phone: driver.phone!, ip: 0 })).toBe(true);
  });

  it("transportista: frena al llegar al límite de la conexión", () => {
    expect(overLimit("availabilities", { phone: 0, ip: driver.ip })).toBe(true);
  });

  it("cliente: sin teléfono, solo cuenta la conexión", () => {
    expect(client.phone).toBeUndefined();
    expect(overLimit("requests", { phone: 0, ip: client.ip - 1 })).toBe(false);
    expect(overLimit("requests", { phone: 0, ip: client.ip })).toBe(true);
  });

  it("el transportista tiene menos margen que el cliente", () => {
    expect(driver.ip).toBeLessThan(client.ip);
  });
});

describe("IP de quien llama", () => {
  it("prefiere x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("usa la primera de x-forwarded-for", () => {
    expect(clientIp(headers({ "x-forwarded-for": " 5.6.7.8 , 10.0.0.1" }))).toBe("5.6.7.8");
  });

  it("sin cabeceras no hay IP", () => {
    expect(clientIp(headers({}))).toBeNull();
  });
});
