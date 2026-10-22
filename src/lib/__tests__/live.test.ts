import { describe, expect, it } from "vitest";
import { ALL_DAYS_TOPIC, liveTopic } from "../live";

describe("liveTopic", () => {
  it("es el mismo canal que arma la migración 0006", () => {
    expect(liveTopic("2026-10-20")).toBe("transportistas-2026-10-20");
  });

  it("el de todos los días es el que arma la migración 0015", () => {
    expect(ALL_DAYS_TOPIC).toBe("transportistas-cualquier_dia");
  });
});
