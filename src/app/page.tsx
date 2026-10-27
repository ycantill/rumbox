import Link from "next/link";
import { GoToActive } from "@/components/one-at-a-time";
import { Logo, ServiceIcon, Symbol, TrackVisit } from "@/components/ui";
import { SERVICES, type Service } from "@/lib/domain";
import { NO_CHARGE_TIP } from "@/lib/safety";

const POINTS = [
  { title: "Sin registro ni comisiones", text: "Diga qué necesita y para dónde." },
  { title: "El precio lo acuerdan ustedes", text: "Por llamada o WhatsApp, sin intermediarios." },
  { title: NO_CHARGE_TIP.replace(/\.$/, ""), text: "Si le piden plata en nuestro nombre, es una estafa." },
];

export default function Home() {
  return (
    <main className="page flex flex-1 flex-col">
      <GoToActive />
      <TrackVisit page="inicio" />

      <section className="bleed flex flex-col gap-7 bg-brand px-[22px] pt-[22px] text-white">
        <header className="flex items-center gap-2.5">
          <Symbol size={40} />
          <Logo size={32} on="brand" />
        </header>
        {/* El marco de aviso, como en una señal de la vía. */}
        <div className="flex flex-col gap-3.5 rounded-lg border-[1.5px] border-white/40 px-5 py-[22px]">
          <h1 className="font-display text-5xl font-black uppercase leading-[0.92] text-pretty">
            Lo que necesite llevar ya tiene quién lo lleve
          </h1>
          <p className="text-base leading-normal text-on-brand-muted text-pretty">
            Conductores que ya van de viaje le hacen el servicio en el camino. Usted habla directo con ellos y acuerdan
            el precio.
          </p>
        </div>
        {/* Los cinco servicios: sobresalen por debajo del bloque azul. */}
        <ul className="-mb-[26px] flex justify-between px-1">
          {(Object.keys(SERVICES) as Service[]).map((s) => (
            <li key={s} className="grid size-[62px] place-items-center rounded-[11px] border border-line bg-white">
              <ServiceIcon service={s} size={60} />
            </li>
          ))}
        </ul>
      </section>
      <div aria-hidden className="flex justify-between pt-10 font-display text-[13px] font-extrabold uppercase leading-none tracking-[0.02em]">
        {(Object.keys(SERVICES) as Service[]).map((s) => (
          <span key={s} className="w-[62px] text-center">
            {SERVICES[s].label}
          </span>
        ))}
      </div>
      <p className="sr-only">Mudanzas, fletes, encomiendas, encargos y diligencias.</p>

      <nav className="flex flex-col gap-3 pt-6">
        <EntryLink href="/solicitar" title="Necesito un servicio" text="Encuentre quién va para su destino" accent />
        <EntryLink href="/transportista" title="Voy de viaje" text="Haga servicios en el camino" />
      </nav>

      <ol className="mt-3 flex flex-col">
        {POINTS.map((p, i) => (
          <li key={p.title} className={`grid grid-cols-[36px_1fr] gap-3.5 py-3.5 ${i > 0 ? "border-t border-line-soft" : ""}`}>
            <span aria-hidden className="font-display text-[26px] font-black leading-none text-brand">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong className="text-base">{p.title}</strong>
              <p className="text-[15px] leading-snug text-muted">{p.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-auto flex gap-5 pt-5 text-sm">
        <Link href="/ayuda" className="text-brand underline">
          Ayuda
        </Link>
        <Link href="/privacidad" className="text-brand underline">
          Cómo cuidamos sus datos
        </Link>
      </footer>
    </main>
  );
}

function EntryLink({ href, title, text, accent = false }: { href: string; title: string; text: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg border border-line p-5 active:translate-y-px ${
        accent ? "bg-accent" : "bg-surface"
      }`}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-[26px] font-black uppercase leading-none">{title}</span>
        <span className={`text-sm ${accent ? "" : "text-muted"}`}>{text}</span>
      </span>
      <span aria-hidden className="font-display text-[28px] font-black">
        →
      </span>
    </Link>
  );
}
