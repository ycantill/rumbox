"use client";

import { useEffect, useEffectEvent, useRef } from "react";

/**
 * Un paso que se puede deshacer con la flecha de atrás del teléfono: abre una
 * entrada en el historial para que atrás vuelva a la pantalla de antes en vez
 * de salir de Rumbox (Yohany, 28 de octubre de 2026). Lo usa "Cambiar" en la
 * solicitud del cliente.
 */
export function useBackStep(active: boolean, onBack: () => void) {
  // true mientras la entrada del paso sigue en el historial.
  const entry = useRef(false);
  const handleBack = useEffectEvent(() => {
    if (!entry.current) return;
    entry.current = false;
    onBack();
  });

  useEffect(() => {
    if (!active) return;
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [active]);

  return {
    /** Empieza el paso. */
    open() {
      window.history.pushState(null, "");
      entry.current = true;
    },
    /** El paso terminó bien: su entrada ya no sirve y atrás no debe volver a él. */
    done() {
      if (!entry.current) return;
      entry.current = false;
      window.history.back();
    },
    /** Lo mismo que la flecha de atrás del teléfono. */
    back() {
      if (entry.current) window.history.back();
      else onBack();
    },
  };
}
