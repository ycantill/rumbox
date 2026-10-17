import { describe, expect, it } from "vitest";
import { addDays, capitalize, daysBetween, expiresText, formatDay, whenText } from "../dates";

describe("addDays y daysBetween", () => {
  it("suman y cuentan días, también al cambiar de mes y de año", () => {
    expect(addDays("2026-10-18", 6)).toBe("2026-10-24");
    expect(addDays("2026-10-28", 6)).toBe("2026-11-03");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-10-18", -6)).toBe("2026-10-12");
    expect(daysBetween("2026-10-18", "2026-10-24")).toBe(6);
    expect(daysBetween("2026-10-24", "2026-10-18")).toBe(-6);
  });
});

describe("expiresText", () => {
  it("cuenta los días que faltan, con hoy y mañana en palabras", () => {
    expect(expiresText("2026-10-24", "2026-10-18")).toBe("Se vence en 6 días");
    expect(expiresText("2026-10-24", "2026-10-22")).toBe("Se vence en 2 días");
    expect(expiresText("2026-10-24", "2026-10-23")).toBe("Se vence mañana");
    expect(expiresText("2026-10-24", "2026-10-24")).toBe("Se vence hoy");
  });
});

describe("whenText", () => {
  const today = "2026-10-16";
  const tomorrow = "2026-10-17";

  it("dice hoy y mañana con palabras", () => {
    expect(whenText(today, today, tomorrow)).toBe("hoy");
    expect(whenText(tomorrow, today, tomorrow)).toBe("mañana");
  });

  it("para otros días da el nombre del día", () => {
    expect(formatDay("2026-10-18")).toBe("domingo 18 de octubre");
    expect(whenText("2026-10-18", today, tomorrow)).toBe("el domingo 18 de octubre");
    expect(capitalize(whenText(today, today, tomorrow))).toBe("Hoy");
  });
});
