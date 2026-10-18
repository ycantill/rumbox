import type { Metadata } from "next";
import Link from "next/link";
import { ClientForm } from "./client-form";

export const metadata: Metadata = {
  title: "Solicitar transportista",
};

export default function ClientPage() {
  return (
    <main className="page">
      <Link href="/" className="text-sm text-muted">
        ← Inicio
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">Necesito mover algo</h1>
      <ClientForm />
    </main>
  );
}
