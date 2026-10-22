// Precarga de datos en el navegador (modelo "Cero Registros"): nada de cuentas,
// solo localStorage. Toda lectura/escritura tolera que el almacenamiento falle.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(STORE_CHANGED));
  } catch {
    // Modo privado o almacenamiento lleno: la app funciona igual.
  }
}

/** Se avisa cada vez que algo se guarda, para las pantallas que dependen de eso. */
export const STORE_CHANGED = "muvia:guardado";

// Las claves conservan el nombre de antes (muvia): cambiarlas haría que el
// teléfono olvide la disponibilidad o la solicitud que ya tiene.
export const KEYS = {
  driverProfile: "muvia.transportista.perfil",
  driverPosts: "muvia.transportista.publicaciones",
  clientPhone: "muvia.cliente.whatsapp",
  clientRequest: "muvia.cliente.solicitud",
  visited: "muvia.ya-vino",
} as const;
