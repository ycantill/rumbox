import { describe, expect, it } from "vitest";
import { eventRow } from "../analytics";

const id = "3f2b6c1e-8a4d-4b7e-9c11-2d5e6f7a8b9c";

describe("eventRow", () => {
  it("acepta una visita a una pantalla conocida", () => {
    expect(eventRow({ kind: "visita", page: "solicitar", returning: true })).toEqual({
      kind: "visita",
      page: "solicitar",
      returning_visitor: true,
      availability_id: null,
    });
  });

  it("acepta los toques de WhatsApp y de llamar con el transportista", () => {
    expect(eventRow({ kind: "whatsapp", availabilityId: id })).toEqual({
      kind: "whatsapp",
      page: null,
      returning_visitor: null,
      availability_id: id,
    });
    expect(eventRow({ kind: "llamada", availabilityId: id })?.kind).toBe("llamada");
  });

  it("rechaza lo que no es un evento conocido", () => {
    expect(eventRow(null)).toBeNull();
    expect(eventRow("visita")).toBeNull();
    expect(eventRow({ kind: "compra" })).toBeNull();
    expect(eventRow({ kind: "visita", page: "admin", returning: false })).toBeNull();
    expect(eventRow({ kind: "visita", page: "inicio" })).toBeNull();
    expect(eventRow({ kind: "whatsapp", availabilityId: "1; drop table" })).toBeNull();
    expect(eventRow({ kind: "llamada" })).toBeNull();
  });

  it("no guarda datos de más que mande el navegador", () => {
    const row = eventRow({ kind: "visita", page: "inicio", returning: false, whatsapp: "3001112233" });
    expect(row).not.toHaveProperty("whatsapp");
  });
});
