import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Muvia · Mudanzas y fletes",
    short_name: "Muvia",
    description: "Mira cuánto cuesta tu mudanza, flete o envío y habla con transportistas por WhatsApp.",
    lang: "es-CO",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f4",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
