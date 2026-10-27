import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_CONNECTION, callServer } from "../server-call";

describe("callServer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("devuelve lo mismo que la acción cuando hay señal", async () => {
    await expect(callServer(async () => ({ ok: true as const, id: "a" }))).resolves.toEqual({ ok: true, id: "a" });
    await expect(callServer(async () => ({ ok: false as const, error: "Elija qué necesita." }))).resolves.toEqual({
      ok: false,
      error: "Elija qué necesita.",
    });
  });

  it("sin señal devuelve un error en vez de romper la pantalla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await callServer(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(res).toEqual({ ok: false, error: NO_CONNECTION });
  });
});
