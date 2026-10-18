import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REFRESH_EVERY_MS, refreshWhileOpen } from "../refresh";

// Un documento mínimo: las pruebas corren en Node, sin navegador.
function fakeDocument() {
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: "visible" as "visible" | "hidden",
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    /** La persona sale de la app o vuelve a ella. */
    setVisible(visible: boolean) {
      doc.visibilityState = visible ? "visible" : "hidden";
      listeners.forEach((fn) => fn());
    },
    listeners,
  };
  return doc;
}

describe("refreshWhileOpen", () => {
  let doc: ReturnType<typeof fakeDocument>;

  beforeEach(() => {
    vi.useFakeTimers();
    doc = fakeDocument();
    vi.stubGlobal("document", doc);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("vuelve a pedir los datos cuando la persona regresa a la app", () => {
    const refresh = vi.fn();
    refreshWhileOpen(refresh);
    doc.setVisible(false);
    expect(refresh).not.toHaveBeenCalled();
    doc.setVisible(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("los pide cada minuto mientras la pantalla se ve, y no cuando está en el fondo", () => {
    const refresh = vi.fn();
    refreshWhileOpen(refresh);
    vi.advanceTimersByTime(REFRESH_EVERY_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    doc.setVisible(false);
    vi.advanceTimersByTime(5 * REFRESH_EVERY_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("se apaga del todo al salir de la pantalla", () => {
    const refresh = vi.fn();
    const stop = refreshWhileOpen(refresh);
    stop();
    vi.advanceTimersByTime(5 * REFRESH_EVERY_MS);
    doc.setVisible(false);
    doc.setVisible(true);
    expect(refresh).not.toHaveBeenCalled();
    expect(doc.listeners.size).toBe(0);
  });
});
