import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { Toast } from "@/components/ui";
import "./globals.css";

// Big Shoulders Display para los títulos, en mayúsculas, y Archivo para el
// texto. Google juntó Big Shoulders Display en Big Shoulders, con el eje de
// tamaño óptico (opsz): globals.css lo pone en su corte Display.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  // Next.js no tiene las medidas de esta fuente para ajustar la de respaldo.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "sans-serif"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Rumbox · Servicios en el camino", template: "%s · Rumbox" },
  description:
    "Mudanzas, fletes, encomiendas, encargos y diligencias con conductores que ya van de viaje. Usted habla directo con ellos por llamada o WhatsApp y acuerdan el precio.",
  applicationName: "Rumbox",
  appleWebApp: { capable: true, title: "Rumbox", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1a3f73",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bigShoulders.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toast />
        <ServiceWorker />
        {/* Visitas y de dónde llegan, en el panel de Vercel. Sin cookies. */}
        <Analytics />
      </body>
    </html>
  );
}
