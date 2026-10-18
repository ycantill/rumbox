import { describe, expect, it } from "vitest";
import { capitalize, formatDay, whenText } from "../dates";

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
