// Lighthouse CI: mide la app compilada con emulación de celular (la
// configuración por defecto de Lighthouse). Las páginas se generan estáticas,
// así que no necesita la base de datos.
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npx next start -p 3200",
      startServerReadyPattern: "Ready",
      url: ["http://localhost:3200/", "http://localhost:3200/solicitar", "http://localhost:3200/transportista"],
      numberOfRuns: 3,
      settings: {
        // Mientras dure el demo la app tiene noindex a propósito (OPEN_TO_SEARCH en
        // src/lib/site.ts). Se salta solo esa auditoría; el resto de SEO cuenta.
        // Cuando se abra a Google, quitar esta línea.
        skipAudits: ["is-crawlable"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.9 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reportes" },
  },
};
