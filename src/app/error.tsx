"use client";

import Link from "next/link";
import { useEffect } from "react";

// Si algo falla sin que lo esperemos, la persona ve este mensaje en vez de la
// pantalla de error en inglés de Next.js.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page flex flex-1 flex-col">
      <h1 className="title mt-10">Algo salió mal</h1>
      <p className="mt-3 text-muted">Revise su señal e intente otra vez.</p>
      <div className="mt-8 flex flex-col gap-3">
        <button type="button" className="btn-primary" onClick={() => retry()}>
          Intentar otra vez
        </button>
        <Link href="/" className="btn-secondary">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
