// Las listas de la pantalla (clientes que esperan al transportista,
// transportistas que le sirven al cliente) no se pueden quedar viejas: se
// vuelven a pedir cuando la persona regresa a la app (por ejemplo, después de
// escribir por WhatsApp) y cada minuto mientras la tiene a la vista.

export const REFRESH_EVERY_MS = 60_000;

/** Llama `refresh` al volver a la app y cada minuto mientras se ve. Devuelve cómo apagarlo. */
export function refreshWhileOpen(refresh: () => void, everyMs = REFRESH_EVERY_MS): () => void {
  const ifVisible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  const timer = setInterval(ifVisible, everyMs);
  document.addEventListener("visibilitychange", ifVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", ifVisible);
  };
}
