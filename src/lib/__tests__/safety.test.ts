import { describe, expect, it } from "vitest";
import { CLIENT_REPORT_REASONS, DRIVER_REPORT_REASONS, isReportReason } from "../safety";

// Las claves que acepta la base de datos (0020_reportes.sql).
const DB_REASONS = ["anticipo", "no_llego", "carga", "pago_falso", "lugar_raro", "ilegal", "maltrato", "otro"];

describe("isReportReason", () => {
  it("acepta los motivos de cada pantalla", () => {
    expect(isReportReason("cliente", "anticipo")).toBe(true);
    expect(isReportReason("transportista", "pago_falso")).toBe(true);
    expect(isReportReason("cliente", "otro")).toBe(true);
  });

  it("no acepta el motivo de la otra pantalla", () => {
    expect(isReportReason("cliente", "pago_falso")).toBe(false);
    expect(isReportReason("transportista", "anticipo")).toBe(false);
  });

  it("no acepta lo que no es un motivo", () => {
    expect(isReportReason("cliente", "")).toBe(false);
    expect(isReportReason("cliente", "toString")).toBe(false);
    expect(isReportReason("cliente", undefined)).toBe(false);
    expect(isReportReason("transportista", 3)).toBe(false);
  });

  it("todos los motivos los acepta la base de datos", () => {
    for (const key of [...Object.keys(CLIENT_REPORT_REASONS), ...Object.keys(DRIVER_REPORT_REASONS)]) {
      expect(DB_REASONS).toContain(key);
    }
  });
});
