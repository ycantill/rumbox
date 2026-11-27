import { describe, expect, it } from "vitest";
import { contactMessage } from "../contact-message";

describe("contactMessage", () => {
  it("dice el servicio, la ruta y el día", () => {
    expect(contactMessage({ service: "flete", from: "Barranquilla", to: "Santa Marta", when: "mañana" })).toBe(
      "Hola, lo encontré en Rumbox. Necesito un servicio de flete de Barranquilla a Santa Marta para mañana. ¿Me puede ayudar?",
    );
  });
  it("con \"Cualquier día\" no dice para cuándo", () => {
    expect(contactMessage({ service: "mudanza", from: "Cali", to: "Popayán", when: null })).toBe(
      "Hola, lo encontré en Rumbox. Necesito un servicio de mudanza de Cali a Popayán. ¿Me puede ayudar?",
    );
  });
  it("las solicitudes de antes, sin servicio, no lo nombran", () => {
    expect(contactMessage({ from: "Cali", to: "Popayán", when: null })).toBe(
      "Hola, lo encontré en Rumbox. Necesito un servicio de Cali a Popayán. ¿Me puede ayudar?",
    );
  });
});
