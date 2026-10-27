// Las piezas de las páginas de apoyo (Ayuda y Cómo cuidamos sus datos), como
// en el prototipo de Rumbox: secciones con su título y una línea arriba,
// viñetas cuadradas en Señal y pasos numerados.

import { Symbol } from "@/components/ui";

/** Arriba: el enlace para volver y, a la derecha, el símbolo. */
export function SupportHeader({ back }: { back: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      {back}
      <Symbol size={30} />
    </div>
  );
}

/** Una sección: la primera sin línea arriba. */
export function SupportSection({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2.5 pt-[22px] ${first ? "" : "border-t border-line-soft"}`}>
      <h2 className="font-display text-2xl font-black uppercase leading-none">{title}</h2>
      {children}
    </section>
  );
}

export function SupportText({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <p className={`text-base leading-relaxed text-pretty ${strong ? "font-semibold" : "text-[#4a5568]"}`}>{children}</p>
  );
}

/** Viñetas: un cuadrito en Señal. */
export function Bullets({ items }: { items: readonly React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[14px_1fr] gap-2.5 text-base leading-normal text-[#4a5568]">
          <span aria-hidden className="mt-[9px] size-1.5 rounded-[1px] bg-brand" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Pasos: 01, 02… en Big Shoulders y Señal. */
export function Steps({ items }: { items: readonly React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[30px_1fr] gap-2.5 text-base leading-normal text-[#4a5568]">
          <span aria-hidden className="font-display text-[22px] font-black leading-[1.1] text-brand">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
