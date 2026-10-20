import type { Metadata } from "next";
import Link from "next/link";
import { DriverForm } from "./driver-form";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Soy transportista",
};

export default function DriverPage() {
  return (
    <main className="page">
      <TrackVisit page="transportista" />
      <Link href="/" className="text-sm text-muted">
        ← Inicio
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">Soy transportista</h1>
      <DriverForm />
    </main>
  );
}
