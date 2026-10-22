// La pantalla del cliente se pone al día sola con Supabase Realtime: cuando un
// transportista se pone disponible o cambia la suya, la base de
// datos manda un mensaje sin datos y la pantalla vuelve a pedir su lista al
// servidor. Usa la llave pública (anon), que no puede leer ninguna tabla.

/**
 * Canal privado de Realtime de un día de viaje: la anon key solo puede
 * escucharlo. Lo arman igual las migraciones `0006_avisos.sql` y
 * `0007_proteger_datos.sql`: no se cambia sin cambiar las dos partes.
 */
export function liveTopic(date: string): string {
  return `transportistas-${date}`;
}

/**
 * El canal que recibe los cambios de transportistas de todos los días
 * (`0015_cualquier_dia_sin_vencer.sql`). Es el que escucha la pantalla del
 * cliente: un transportista le sirve desde su día en adelante.
 */
export const ALL_DAYS_TOPIC = "transportistas-cualquier_dia";

/** El evento que manda la base de datos al canal. */
export const LIVE_EVENT = "cambio";

/** Espera un poco antes de pedir la lista, por si llegan varios mensajes juntos. */
const SETTLE_MS = 1_000;

/**
 * Escucha los cambios de transportistas de todos los días y llama `onChange`.
 * Devuelve cómo dejar de escuchar. Sin la configuración de Supabase
 * (`getLiveConfig`) no se llama: la pantalla se pone al día cada minuto.
 */
export function listenForDrivers(
  live: { url: string; anonKey: string },
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
      .channel(ALL_DAYS_TOPIC, { config: { private: true } })
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
