"use client";

// Una cosa a la vez en cada teléfono: si tiene una solicitud o un viaje
// abierto, Rumbox lo lleva siempre a esa pantalla. El inicio y la pantalla del
// otro papel no se ven hasta que lo cierre: desde ahí no podría hacer nada.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import type { MyRequest } from "@/app/solicitar/client-form";
import type { MyPost } from "@/app/transportista/driver-form";
import { KEYS, STORE_CHANGED, load } from "@/lib/local-store";
import { activeScreen } from "@/lib/one-at-a-time";

type Screen = ReturnType<typeof activeScreen>;

function subscribe(onChange: () => void) {
  window.addEventListener(STORE_CHANGED, onChange);
  // Otra pestaña cambió lo guardado.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STORE_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readScreen(): Screen {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return activeScreen(
    {
      request: load<MyRequest | null>(KEYS.clientRequest, null),
      trip: load<MyPost[]>(KEYS.driverPosts, [])[0],
    },
    today,
  );
}

/**
 * La pantalla de lo que el teléfono tiene abierto, al día con lo que se guarda.
 * undefined mientras no se sabe (en el HTML prerenderizado), null si no tiene nada.
 */
export function useActiveScreen(): Screen | undefined {
  return useSyncExternalStore(subscribe, readScreen, () => undefined);
}

/** Si el teléfono tiene algo abierto en otra pantalla, lo lleva ahí. */
export function GoToActive() {
  const router = useRouter();
  const pathname = usePathname();
  const screen = useActiveScreen();
  useEffect(() => {
    if (screen && screen !== pathname) router.replace(screen);
  }, [screen, pathname, router]);
  return null;
}

/** "← Inicio", solo si no tiene nada abierto: con algo abierto, el inicio lo traería de vuelta. */
export function BackHome() {
  const screen = useActiveScreen();
  if (screen !== null) return <span className="block h-5" aria-hidden />;
  return (
    <Link href="/" className="text-[15px] text-muted">
      ← Inicio
    </Link>
  );
}

/**
 * Para las páginas que se abren desde cualquier lado, como /ayuda: vuelve a lo
 * que tiene abierto o, si no tiene nada, al inicio.
 */
export function BackLink() {
  const screen = useActiveScreen();
  if (screen === undefined) return <span className="block h-5" aria-hidden />;
  return (
    <Link href={screen ?? "/"} className="text-[15px] text-muted">
      {screen ? "← Volver" : "← Inicio"}
    </Link>
  );
}
