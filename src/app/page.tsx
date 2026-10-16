import Link from "next/link";

export default function Home() {
  return (
    <main className="page flex flex-1 flex-col">
      <header className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-brand font-bold text-white dark:text-bg">
          M
        </span>
        <span className="text-lg font-bold">Muvia</span>
      </header>

      <section className="mt-10">
        <h1 className="text-3xl font-bold leading-tight">
          Mudanzas, fletes y envíos con transportistas que ya van en tu ruta.
        </h1>
        <p className="mt-3 text-muted">
          Cotiza en segundos, conecta por WhatsApp y paga menos aprovechando los viajes de retorno.
          Sin registro y sin comisiones.
        </p>
      </section>

      <nav className="mt-10 flex flex-col gap-3">
        <Link href="/cotizar" className="btn-primary text-center">
          Necesito mover algo
        </Link>
        <Link href="/transportista" className="btn-secondary py-3.5 text-center text-base">
          Soy transportista
        </Link>
      </nav>

      <ul className="mt-12 grid gap-4 text-sm">
        <li className="card">
          <strong>Precio claro antes de hablar.</strong>
          <span className="block text-muted">Tarifa base por distancia y volumen, más ajustes visibles.</span>
        </li>
        <li className="card">
          <strong>Hasta 25% menos en rutas programadas.</strong>
          <span className="block text-muted">Si un transportista ya va hacia tu destino, el precio baja.</span>
        </li>
        <li className="card">
          <strong>Directo por WhatsApp.</strong>
          <span className="block text-muted">Acuerdas el servicio con el transportista, sin intermediarios.</span>
        </li>
      </ul>
    </main>
  );
}
