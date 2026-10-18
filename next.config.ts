import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // La pantalla del cliente antes estaba en /cotizar: los enlaces guardados o
  // compartidos siguen funcionando.
  redirects() {
    return [{ source: "/cotizar", destination: "/solicitar", permanent: true }];
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
