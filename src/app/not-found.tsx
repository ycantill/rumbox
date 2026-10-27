import type { Metadata } from "next";
import Link from "next/link";
import { Symbol } from "@/components/ui";

export const metadata: Metadata = {
  title: "No encontramos esta página",
};

// Una dirección que no existe: la persona ve esto en vez del 404 en inglés de Next.js.
export default function NotFound() {
  return (
    <main className="page flex flex-1 flex-col justify-center gap-[22px] pb-9">
      <div className="flex items-end gap-3.5">
        <Symbol size={84} />
        <span aria-hidden className="pb-2 font-display text-[64px] font-black leading-[0.8] text-line">
          404
        </span>
      </div>
      <h1 className="title">No encontramos esta página</h1>
      <p className="text-base leading-normal text-[#4a5568]">Puede que el enlace esté mal escrito o que ya no exista.</p>
      <Link href="/" className="btn-primary">
        Volver al inicio
      </Link>
      <Link href="/ayuda" className="btn-secondary">
        Ir a Ayuda
      </Link>
    </main>
  );
}
