import { describe, expect, it } from "vitest";
import { addDays, capitalize, formatDay, isStillValid, whenText } from "../dates";
import { ANY_DAY } from "../domain";

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

describe("addDays", () => {
  it("suma y resta días, también al cambiar de mes y de año", () => {
    expect(addDays("2026-10-18", 1)).toBe("2026-10-19");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });
});

describe("isStillValid", () => {
  it("vale hasta que termina el día del servicio", () => {
    expect(isStillValid("2026-10-18", "2026-10-18")).toBe(true);
    expect(isStillValid("2026-10-18", "2026-10-19")).toBe(false);
  });

  it("un servicio para mañana vale hoy y mañana, y se vence pasado mañana", () => {
    const today = "2026-10-18";
    const tomorrow = "2026-10-19";
    expect(isStillValid(tomorrow, today)).toBe(true);
    expect(isStillValid(tomorrow, tomorrow)).toBe(true);
    expect(isStillValid(tomorrow, "2026-10-20")).toBe(false);
  });

  it("la solicitud de cualquier día no se vence", () => {
    expect(isStillValid(ANY_DAY, "2027-05-01")).toBe(true);
  });

  it("sin fecha, o con una que no sirve, ya no vale", () => {
    expect(isStillValid(undefined as unknown as string, "2026-10-18")).toBe(false);
    expect(isStillValid("", "2026-10-18")).toBe(false);
    expect(isStillValid("mañana", "2026-10-18")).toBe(false);
  });
});
