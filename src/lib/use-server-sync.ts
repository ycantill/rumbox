"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { refreshWhileOpen } from "./refresh";

/**
 * Mantiene una pantalla al día con el servidor: consulta al abrirla (salvo que
 * ya traiga datos recién pedidos), al volver a la app, cada minuto mientras se
 * ve y cuando llega un aviso en vivo. Lo usan la pantalla del conductor
 * disponible y la de la solicitud del cliente.
 *
 * Cada consulta lleva un número: una respuesta vieja no pisa una más nueva ni
 * un cambio que la persona hizo mientras tanto. Antes y después de un cambio,
 * la pantalla llama `invalidate()` para descartar lo que esté en camino.
 */
export function useServerSync<T>({
  key,
  fetch,
  onResult,
  onOffline,
  fresh = false,
  enabled = true,
  subscribe,
}: {
  /** Lo que identifica lo guardado: si cambia, la sincronización empieza de nuevo. */
  key: string;
  fetch: () => Promise<T>;
  onResult: (result: T) => void;
  /** Sin señal en la consulta al abrir. Las automáticas fallan en silencio. */
  onOffline: () => void;
  /** Si la pantalla ya trae datos recién pedidos, no se consulta al abrir. */
  fresh?: boolean;
  enabled?: boolean;
  /** Avisos en vivo (Realtime). Recibe cómo consultar y devuelve cómo dejar de escuchar. */
  subscribe?: (refresh: () => void) => () => void;
}): { invalidate: () => void } {
  const latest = useRef(0);
  const doFetch = useEffectEvent(fetch);
  const handleResult = useEffectEvent(onResult);
  const handleOffline = useEffectEvent(onOffline);
  const doSubscribe = useEffectEvent((refresh: () => void) => subscribe?.(refresh) ?? (() => {}));

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    function refresh(quiet: boolean) {
      const n = ++latest.current;
      doFetch().then(
        (res) => {
          if (!cancelled && n === latest.current) handleResult(res);
        },
        () => {
          if (!cancelled && !quiet && n === latest.current) handleOffline();
        },
      );
    }
    // Primero los avisos en vivo: las acciones del servidor van una detrás de
    // otra, y pedir sus datos es rápido porque no toca la base de datos.
    const unsubscribe = doSubscribe(() => refresh(true));
    if (!fresh) refresh(false);
    const stop = refreshWhileOpen(() => refresh(true));
    return () => {
      cancelled = true;
      stop();
      unsubscribe();
    };
  }, [key, fresh, enabled]);

  const invalidate = useCallback(() => {
    latest.current++;
  }, []);
  return { invalidate };
}
