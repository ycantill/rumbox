import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/one-at-a-time";
import { Bullets, Steps, SupportHeader, SupportSection, SupportText } from "@/components/support";
import { NO_CHARGE_TIP } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Qué acordar antes del servicio y qué hacer si lo estafan.",
};

const LINK = "font-semibold text-brand underline";

// Ayuda (Yohany, 23 de octubre de 2026): solo fraudes y seguridad, no cómo usar
// la app. Rumbox no atiende los casos, así que van los pasos que la persona
// puede dar sola y que sí pueden resolverlo: el banco, el 123 y la denuncia.
export default function HelpPage() {
  return (
    <main className="page flex flex-col gap-[22px] pb-9">
      <SupportHeader back={<BackLink />} />
      <h1 className="title">Ayuda</h1>

      <section className="flex flex-col gap-3 rounded-lg border border-[#f0b8a8] bg-[#fdeee9] p-[18px]">
        <h2 className="card-title text-[oklch(0.45_0.15_28)]">Si está en peligro</h2>
        <p className="text-base leading-normal text-[oklch(0.38_0.12_28)]">
          Llame ya a la Policía al <b>123</b>. Es gratis desde cualquier celular.
        </p>
        <a
          href="tel:123"
          className="rounded-md bg-[oklch(0.48_0.16_28)] p-3.5 text-center font-display text-[22px] font-black uppercase leading-none text-white active:translate-y-px"
        >
          Llamar al 123
        </a>
      </section>

      <div className="flex flex-col gap-[22px]">
        <SupportSection title="Antes del servicio, acuerden por WhatsApp" first>
          <SupportText>Que quede escrito en el chat:</SupportText>
          <Bullets
            items={[
              "El precio y qué incluye.",
              "El día y la hora, y las dos direcciones.",
              "Quién carga y si hay escaleras.",
              "Cómo se paga y cuándo. Lo mejor es al entregar.",
            ]}
          />
        </SupportSection>

        <SupportSection title="Si pagó y no le cumplieron">
          <Steps
            items={[
              "Llame de una vez a su banco, a Nequi o a Daviplata y cuénteles lo que pasó. Si avisa rápido, a veces pueden frenar la plata.",
              "Guarde los pantallazos del chat, el número que le habló y el comprobante del pago.",
              <>
                Denuncie por internet en{" "}
                <a className={LINK} href="https://adenunciar.policia.gov.co/adenunciar/" target="_blank" rel="noopener noreferrer">
                  ADenunciar
                </a>{" "}
                o pida orientación en el{" "}
                <a className={LINK} href="https://caivirtual.policia.gov.co/" target="_blank" rel="noopener noreferrer">
                  CAI Virtual
                </a>{" "}
                de la Policía.
              </>,
              "Bloquee el número en WhatsApp y no le mande más plata, aunque le prometa devolverla.",
            ]}
          />
        </SupportSection>

        <SupportSection title="Si se quedaron con sus cosas o con su carro">
          <SupportText>
            Llame al 123 y denuncie en ADenunciar. Lleve la placa, la foto de la cédula y los pantallazos del chat:
            ayudan a encontrar a la persona.
          </SupportText>
        </SupportSection>

        <SupportSection title="Si usted va de viaje">
          <Bullets
            items={[
              "Si le mostraron un pago que no le llegó, no entregue la carga hasta verlo en la app de su banco.",
              "Si lo citan en un lugar solo o raro, no vaya. Pida que se vean en un lugar con gente.",
              "Si le piden llevar algo que no le dejan ver, no lo lleve. Si ya lo lleva y sospecha, llame al 123.",
            ]}
          />
        </SupportSection>
      </div>

      <section className="flex flex-col gap-2 rounded-lg border border-line bg-notice p-[18px]">
        <h2 className="font-display text-2xl font-black uppercase leading-none">{NO_CHARGE_TIP}</h2>
        <p className="text-base leading-normal">
          Si alguien dice que es de Rumbox y le pide plata, una inscripción o un código, es una estafa. No le pague ni
          le mande nada.
        </p>
      </section>

      <p className="text-[15px] text-[#4a5568]">
        Mire también{" "}
        <Link href="/privacidad" className={LINK}>
          cómo cuidamos sus datos
        </Link>
        .
      </p>
    </main>
  );
}
