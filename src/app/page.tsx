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

      <section className="bleed flex flex-col gap-[26px] bg-brand px-[22px] pb-[26px] pt-[22px] text-white">
        <header className="flex items-center gap-2.5">
          <Symbol size={40} />
          <Logo size={32} on="brand" />
        </header>
        {/* El marco de aviso, como en una señal de la vía. */}
        <div className="flex flex-col gap-3.5 rounded-lg border-[1.5px] border-white/40 px-5 py-[22px]">
          <h1 className="font-display text-[46px] font-black uppercase leading-[0.92] text-pretty">
            Lo que necesite llevar ya tiene quién lo lleve
          </h1>
          <p className="text-base leading-normal text-on-brand-muted text-pretty">
            Conductores que ya van de viaje le hacen el servicio en el camino. Usted habla directo con ellos y acuerdan
            el precio.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 pt-6">
        <h2 className="guide-label text-muted">Servicios que puede pedir</h2>
        <ul className="flex justify-between">
          {(Object.keys(SERVICES) as Service[]).map((s) => (
            <li key={s} className="flex w-[62px] flex-col items-center gap-1">
              <ServiceIcon service={s} size={34} />
              <span className="text-xs font-medium text-muted">{SERVICES[s].label}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-col gap-3 py-6">
        <EntryLink href="/solicitar" title="Necesito un servicio" text="Encuentre quién va para su destino" />
        <EntryLink href="/transportista" title="Voy de viaje" text="Haga servicios en el camino" />
      </nav>

      <ol className="flex flex-col">
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

function EntryLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-line bg-surface p-5 hover:bg-paper active:translate-y-px"
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-[26px] font-black uppercase leading-none">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
      <span aria-hidden className="font-display text-[28px] font-black text-brand">
        →
      </span>
    </Link>
  );
}
