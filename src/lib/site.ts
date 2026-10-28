// La dirección oficial de Rumbox y si Google ya puede mostrarla.

/** El dominio definitivo. Lo usan la imagen para compartir, el mapa del sitio y robots. */
export const SITE_URL = "https://rumbox.co";

/**
 * Mientras dure el demo, Google no muestra Rumbox (noindex): el contacto del
 * responsable es de prueba (src/lib/legal.ts). Se pone en true el día que se
 * abra al público (docs/pendientes.md, punto 10c).
 */
export const OPEN_TO_SEARCH = false;

/** Las pantallas que van en el mapa del sitio. */
export const PUBLIC_PAGES = ["/", "/solicitar", "/transportista", "/ayuda", "/privacidad", "/terminos"] as const;
