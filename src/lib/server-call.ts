// Llamadas a las acciones del servidor desde el navegador. Con mala señal la
// llamada puede no llegar; sin esto el error rompe la pantalla y la persona
// pierde lo que había llenado.

/** Lo que ve la persona cuando no hay cómo hablar con el servidor. */
export const NO_CONNECTION = "No pudimos conectarnos. Revise su señal e intente otra vez.";

/**
 * Llama una acción del servidor. Si la llamada no llega (sin señal o el
 * servidor caído), devuelve un error como los demás en vez de lanzarlo.
 */
export async function callServer<T>(action: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await action();
  } catch (err) {
    console.error(err);
    return { ok: false, error: NO_CONNECTION };
  }
}
