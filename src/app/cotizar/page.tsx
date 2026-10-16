import type { Metadata } from "next";
import Link from "next/link";
import { QuoteWizard } from "./quote-wizard";

export const metadata: Metadata = {
  title: "Cotizar mudanza o envío",
};

export default function QuotePage() {
  return (
    <main className="page">
      <Link href="/" className="text-sm text-muted">
        ← Inicio
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Cotiza tu mudanza o envío</h1>
      <p className="mb-6 mt-1 text-sm text-muted">4 pasos rápidos, sin registrarte.</p>
      <QuoteWizard />
    </main>
  );
}
