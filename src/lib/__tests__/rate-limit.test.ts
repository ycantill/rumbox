import { describe, expect, it } from "vitest";
import { LIMITS, clientIp, overLimit } from "../rate-limit";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("límite de lo que se guarda", () => {
  for (const table of ["requests", "availabilities"] as const) {
    const max = LIMITS[table];

    it(`${table}: deja pasar por debajo de los dos límites`, () => {
      expect(overLimit(table, { phone: max.phone - 1, ip: max.ip - 1 })).toBe(false);
    });

    it(`${table}: frena al llegar al límite del teléfono`, () => {
      expect(overLimit(table, { phone: max.phone, ip: 0 })).toBe(true);
    });

    it(`${table}: frena al llegar al límite de la conexión`, () => {
      expect(overLimit(table, { phone: 0, ip: max.ip })).toBe(true);
    });
  }

  it("el transportista tiene menos margen que el cliente", () => {
    expect(LIMITS.availabilities.phone).toBeLessThan(LIMITS.requests.phone);
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
