import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Muvia · Mudanzas y fletes", template: "%s · Muvia" },
  description:
    "Cotiza tu mudanza, flete o envío en segundos y conecta por WhatsApp con transportistas que ya van en tu ruta.",
  applicationName: "Muvia",
  appleWebApp: { capable: true, title: "Muvia", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
