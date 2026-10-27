import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "No encontramos esta página",
};

// Una dirección que no existe: la persona ve esto en vez del 404 en inglés de Next.js.
export default function NotFound() {
  return (
    <main className="page flex flex-1 flex-col">
      <h1 className="title mt-10">No encontramos esta página</h1>
      <p className="mt-3 text-muted">Puede que el enlace esté mal escrito o que ya no exista.</p>
      <div className="mt-8 flex flex-col gap-3">
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
