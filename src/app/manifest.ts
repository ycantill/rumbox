import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mudavía · Mudanzas y fletes",
    short_name: "Mudavía",
    description: "Mira cuánto cuesta tu mudanza, flete o envío y habla con transportistas por llamada o WhatsApp.",
    lang: "es-CO",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f4",
    theme_color: "#0f766e",
    // Los PNG son para los teléfonos que no usan el SVG para instalar la app.
    // Se generaron desde los mismos SVG; el del iPhone está en src/app/apple-icon.png.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
