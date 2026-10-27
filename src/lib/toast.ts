// El aviso de abajo ("Listo. Cerramos su solicitud."), que sale después de ir
// a otra pantalla. Se guarda en sessionStorage por si la pantalla nueva se
// carga de cero, y se avisa con un evento por si no.

const KEY = "muvia.aviso";
export const TOAST_EVENT = "muvia:aviso";

/** Muestra el aviso en la pantalla a la que va la persona. */
export function announce(message: string): void {
  try {
    window.sessionStorage.setItem(KEY, message);
  } catch {
    // Sin almacenamiento, el evento basta mientras no recargue.
  }
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

/** El aviso pendiente, que se borra al leerlo para que salga una sola vez. */
export function takeAnnouncement(): string | null {
  try {
    const message = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
