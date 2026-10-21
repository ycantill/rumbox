import Link from "next/link";
import { GoToActive } from "@/components/one-at-a-time";
import { TrackVisit } from "@/components/ui";

export default function Home() {
  return (
    <main className="page flex flex-1 flex-col">
      <GoToActive />
      <TrackVisit page="inicio" />
      <header className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-brand font-bold text-white dark:text-bg">
          M
        </span>
        <span className="text-lg font-bold">Mudavía</span>
      </header>

      <section className="mt-10">
        <h1 className="text-3xl font-bold leading-tight">
          Mudanzas, fletes y envíos con transportistas que ya van para donde tú vas.
        </h1>
        <p className="mt-3 text-muted">
          Encuentra un transportista que ya va para allá, llámalo o escríbele por WhatsApp y acuerden el precio.
          Sin registro y sin comisiones.
        </p>
      </section>

      <nav className="mt-10 flex flex-col gap-3">
        <Link href="/solicitar" className="btn-primary text-center">
          Necesito mover algo
        </Link>
        <Link href="/transportista" className="btn-secondary py-3.5 text-center text-base">
          Soy transportista
        </Link>
      </nav>

      <ul className="mt-12 grid gap-4 text-sm">
        <li className="card">
          <strong>Transportistas que ya van para allá.</strong>
          <span className="block text-muted">Aprovechas el espacio libre de un viaje que ya iban a hacer.</span>
        </li>
        <li className="card">
          <strong>El precio lo acuerdan ustedes.</strong>
          <span className="block text-muted">Mudavía no pone precios: lo hablan entre los dos.</span>
        </li>
        <li className="card">
          <strong>Directo por llamada o WhatsApp.</strong>
          <span className="block text-muted">Hablas directo con el transportista, sin intermediarios.</span>
        </li>
      </ul>

      <footer className="mt-auto pt-10 text-center text-xs text-muted">
        <Link href="/privacidad" className="underline">
          Cómo cuidamos tus datos
        </Link>
      </footer>
    </main>
  );
}
