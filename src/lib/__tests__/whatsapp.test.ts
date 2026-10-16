import { describe, expect, it } from "vitest";
import { normalizeWhatsApp } from "../whatsapp";

describe("normalizeWhatsApp", () => {
  it("agrega el indicativo de Colombia a celulares locales", () => {
    expect(normalizeWhatsApp("300 123 4567")).toBe("573001234567");
    expect(normalizeWhatsApp("+57 300-123-4567")).toBe("573001234567");
  });
  it("rechaza números incompletos", () => {
    expect(normalizeWhatsApp("12345")).toBeNull();
    expect(normalizeWhatsApp("57 123")).toBeNull();
  });
});
