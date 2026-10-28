import type { MetadataRoute } from "next";
import { OPEN_TO_SEARCH, SITE_URL } from "@/lib/site";

// Se deja pasar a Google aunque no se pueda mostrar todavía: si no entra a la
// página, no ve el noindex del layout y la podría mostrar sin descripción.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(OPEN_TO_SEARCH ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
