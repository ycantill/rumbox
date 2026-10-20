import { describe, expect, it } from "vitest";
import { MAX_PER_IP, MAX_PER_PHONE, clientIp, overLimit } from "../rate-limit";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("límite de solicitudes", () => {
  it("deja pasar por debajo de los dos límites", () => {
    expect(overLimit({ phone: MAX_PER_PHONE - 1, ip: MAX_PER_IP - 1 })).toBe(false);
  });

  it("frena al llegar al límite del teléfono", () => {
    expect(overLimit({ phone: MAX_PER_PHONE, ip: 0 })).toBe(true);
  });

  it("frena al llegar al límite de la conexión", () => {
    expect(overLimit({ phone: 0, ip: MAX_PER_IP })).toBe(true);
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
