import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // La pantalla del cliente antes estaba en /cotizar: los enlaces guardados o
  // compartidos siguen funcionando.
  redirects() {
    return [{ source: "/cotizar", destination: "/solicitar", permanent: true }];
  },
  // Protecciones básicas: que ninguna otra página meta Mudavía dentro de la suya
  // para engañar con los toques, y que el navegador no adivine tipos de
  // archivo ni le cuente a otras páginas desde dónde llegó la persona.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
