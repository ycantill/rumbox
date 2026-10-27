import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/one-at-a-time";
import { NO_CHARGE_TIP } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Ayuda",
};

// Ayuda (Yohany, 23 de octubre de 2026): solo fraudes y seguridad, no cómo usar
// la app. Rumbox no atiende los casos, así que van los pasos que la persona
// puede dar sola y que sí pueden resolverlo: el banco, el 123 y la denuncia.
export default function HelpPage() {
  return (
    <main className="page">
      <BackLink />
      <h1 className="title mb-6 mt-4">Ayuda</h1>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed">
        <section className="rounded-lg bg-danger-soft p-4 text-danger">
          <h2 className="card-title">Si está en peligro</h2>
          <p className="mt-1">
            Llame ya a la Policía al{" "}
            <a className="font-bold underline" href="tel:123">
              123
            </a>
            . Es gratis desde cualquier celular.
          </p>
        </section>

        <section>
          <h2 className="card-title">Antes del servicio, acuerden por WhatsApp</h2>
          <p className="mt-1 text-muted">Que quede escrito en el chat:</p>
          <ul className="list-disc pl-5 text-muted">
            <li>El precio y qué incluye.</li>
            <li>El día y la hora, y las dos direcciones.</li>
            <li>Quién carga y si hay escaleras.</li>
            <li>Cómo se paga y cuándo. Lo mejor es al entregar.</li>
          </ul>
        </section>

        <section>
          <h2 className="card-title">Si pagó y no le cumplieron</h2>
          <ol className="mt-1 list-decimal pl-5 text-muted">
            <li>
              Llame de una vez a su banco, a Nequi o a Daviplata y cuénteles lo que pasó. Si avisa rápido, a veces
              pueden frenar la plata.
            </li>
            <li>Guarde los pantallazos del chat, el número que le habló y el comprobante del pago.</li>
            <li>
              Denuncie por internet en{" "}
              <a className="text-brand underline" href="https://adenunciar.policia.gov.co/adenunciar/" target="_blank" rel="noopener noreferrer">
                ADenunciar
              </a>{" "}
              o pida orientación en el{" "}
              <a className="text-brand underline" href="https://caivirtual.policia.gov.co/" target="_blank" rel="noopener noreferrer">
                CAI Virtual
              </a>{" "}
              de la Policía.
            </li>
            <li>Bloquee el número en WhatsApp y no le mande más plata, aunque le prometa devolverla.</li>
          </ol>
        </section>

        <section>
          <h2 className="card-title">Si se quedaron con sus cosas o con su carro</h2>
          <p className="mt-1 text-muted">
            Llame al 123 y denuncie en ADenunciar. Lleve la placa, la foto de la cédula y los pantallazos del chat:
            ayudan a encontrar a la persona.
          </p>
        </section>

        <section>
          <h2 className="card-title">Si usted va de viaje</h2>
          <ul className="mt-1 list-disc pl-5 text-muted">
            <li>Si le mostraron un pago que no le llegó, no entregue la carga hasta verlo en la app de su banco.</li>
            <li>Si lo citan en un lugar solo o raro, no vaya. Pida que se vean en un lugar con gente.</li>
            <li>
              Si le piden llevar algo que no le dejan ver, no lo lleve. Si ya lo lleva y sospecha, llame al 123.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="card-title">{NO_CHARGE_TIP}</h2>
          <p className="mt-1 text-muted">
            Si alguien dice que es de Rumbox y le pide plata, una inscripción o un código, es una estafa. No le pague
            ni le mande nada.
          </p>
        </section>

        <p className="text-muted">
          Mire también{" "}
          <Link href="/privacidad" className="text-brand underline">
            cómo cuidamos sus datos
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
