// La pantalla del cliente se pone al día sola con Supabase Realtime: cuando un
// transportista del mismo día se pone disponible o cambia la suya, la base de
// datos manda un mensaje sin datos y la pantalla vuelve a pedir su lista al
// servidor. Usa la llave pública (anon), que no puede leer ninguna tabla.

import { LIVE_EVENT, liveTopic } from "./alerts";

/** Espera un poco antes de pedir la lista, por si llegan varios mensajes juntos. */
const SETTLE_MS = 1_000;

/**
 * Escucha los cambios de transportistas de un día y llama `onChange`.
 * Devuelve cómo dejar de escuchar. Sin la configuración de Supabase
 * (`getAlertsConfig`) no se llama: la pantalla se pone al día cada minuto.
 */
export function listenForDrivers(
  live: { url: string; anonKey: string },
  date: string,
  onChange: () => void,
): () => void {
  const { url, anonKey: key } = live;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stop = () => {};

  import("@supabase/supabase-js").then(({ createClient }) => {
    if (stopped) return;
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const channel = client
      .channel(liveTopic(date), { config: { private: true } })
      .on("broadcast", { event: LIVE_EVENT }, () => {
        clearTimeout(timer);
        timer = setTimeout(onChange, SETTLE_MS);
      })
      .subscribe();
    stop = () => {
      client.removeChannel(channel);
    };
  }, console.error);

  return () => {
    stopped = true;
    clearTimeout(timer);
    stop();
  };
}
