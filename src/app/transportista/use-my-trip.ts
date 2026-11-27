"use client";

import { useCallback, useEffect, useState } from "react";
import { servicesOf } from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import type { MyPost, Profile } from "./types";

/**
 * El viaje del conductor guardado en su teléfono (uno a la vez) y el número
 * con que se puso disponible la última vez. localStorage solo existe en el
 * navegador: se lee después de hidratar, cuando ya se sabe qué día es hoy.
 */
export function useMyTrip(today: string) {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [savedPhone, setSavedPhone] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedPhone(load<Profile>(KEYS.driverProfile, { whatsapp: "" }).whatsapp);
    // Los encargos y las diligencias salieron (Yohany, 4 de noviembre de
    // 2026): si los tenía marcados en este teléfono, se le quitan.
    setPosts(
      load<MyPost[]>(KEYS.driverPosts, []).map((p) => (p.services ? { ...p, services: servicesOf(p.services) ?? [] } : p)),
    );
    setLoaded(Boolean(today));
  }, [today]);

  const update = useCallback((p: MyPost) => {
    setPosts([p]);
    save(KEYS.driverPosts, [p]);
  }, []);

  // Cambia solo una parte, sobre lo último guardado: lo que llega de una
  // consulta o de "¿Por dónde va?" no pisa lo que cambió mientras tanto.
  const patch = useCallback((change: Partial<MyPost>) => {
    setPosts((ps) => {
      if (!ps[0]) return ps;
      const p = { ...ps[0], ...change };
      save(KEYS.driverPosts, [p]);
      return [p];
    });
  }, []);

  const clear = useCallback(() => {
    setPosts([]);
    save(KEYS.driverPosts, []);
  }, []);

  const rememberPhone = useCallback((whatsapp: string) => {
    save(KEYS.driverProfile, { whatsapp } satisfies Profile);
  }, []);

  return { loaded, current: posts[0] as MyPost | undefined, savedPhone, update, patch, clear, rememberPhone };
}
