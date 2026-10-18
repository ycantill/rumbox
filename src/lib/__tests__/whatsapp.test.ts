import { describe, expect, it } from "vitest";
import { formatWhatsApp, normalizeWhatsApp, telLink } from "../whatsapp";

describe("normalizeWhatsApp", () => {
  it("agrega el indicativo de Colombia a celulares locales", () => {
    expect(normalizeWhatsApp("300 123 4567")).toBe("573001234567");
    expect(normalizeWhatsApp("+57 300-123-4567")).toBe("573001234567");
  });
  it("rechaza números incompletos", () => {
    expect(normalizeWhatsApp("12345")).toBeNull();
    expect(normalizeWhatsApp("57 123")).toBeNull();
  });
  it("un celular con un dígito de más o de menos no pasa como número de otro país", () => {
    expect(normalizeWhatsApp("300 123 45678")).toBeNull();
    expect(normalizeWhatsApp("300 123 456")).toBeNull();
    expect(normalizeWhatsApp("+57 300 123 45678")).toBeNull();
  });
  it("los fijos de Colombia quedan con el 57", () => {
    expect(normalizeWhatsApp("604 123 4567")).toBe("576041234567");
  });
  it("acepta números de otro país con su indicativo", () => {
    expect(normalizeWhatsApp("+58 412 123 4567")).toBe("584121234567");
    expect(normalizeWhatsApp("58 412 123 4567")).toBe("584121234567");
    expect(normalizeWhatsApp("+1 305 555 1234")).toBe("13055551234");
  });
  it("un número de 10 dígitos que no es de Colombia necesita el +", () => {
    expect(normalizeWhatsApp("200 123 4567")).toBeNull();
  });
});

describe("formatWhatsApp", () => {
  it("muestra los números de Colombia como se dictan", () => {
    expect(formatWhatsApp("573001234567")).toBe("300 123 4567");
    expect(formatWhatsApp("576041234567")).toBe("604 123 4567");
  });
  it("los de otro país quedan con + y el indicativo", () => {
    expect(formatWhatsApp("584121234567")).toBe("+584121234567");
  });
});

describe("telLink", () => {
  it("llama al número con el indicativo, también a un fijo o a otro país", () => {
    expect(telLink("573001234567")).toBe("tel:+573001234567");
    expect(telLink("576041234567")).toBe("tel:+576041234567");
    expect(telLink("584121234567")).toBe("tel:+584121234567");
  });
});
