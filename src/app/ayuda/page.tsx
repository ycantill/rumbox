import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/one-at-a-time";
import { NO_CHARGE_TIP } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Ayuda",
};

// Ayuda (Yohany, 23 de octubre de 2026): cómo funciona, qué acordar antes del
// trasteo, qué hacer si algo sale mal y las preguntas de siempre. Mudavía no
// atiende los casos, así que van los pasos que la persona puede dar sola y que
// sí pueden resolverlo: el banco, el 123 y la denuncia.
export default function HelpPage() {
  return (
    <main className="page">
      <BackLink />
      <h1 className="mb-6 mt-3 text-2xl font-bold">Ayuda</h1>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <section className="rounded-2xl bg-danger-soft p-4 text-danger">
          <h2 className="text-base font-bold">Si estás en peligro</h2>
          <p className="mt-1">
            Llama ya a la Policía al{" "}
            <a className="font-bold underline" href="tel:123">
              123
            </a>
            . Es gratis desde cualquier celular.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Cómo funciona</h2>
          <p className="mt-1 font-semibold">Si necesitas mover algo</p>
          <ol className="list-decimal pl-5 text-muted">
            <li>Dices de dónde a dónde, qué día y qué vas a mover.</li>
            <li>Te salen los transportistas que ya van para allá y tienen espacio.</li>
            <li>Los llamas o les escribes por WhatsApp y acuerdan el precio.</li>
          </ol>
          <p className="mt-2 font-semibold">Si eres transportista</p>
          <ol className="list-decimal pl-5 text-muted">
            <li>Dices dónde estás, hacia dónde vas, qué día y cuánto puedes llevar.</li>
            <li>Les sales a los clientes que necesitan mover algo por tu camino.</li>
            <li>Ellos te llaman o te escriben por WhatsApp.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-bold">Antes del trasteo, acuerden por WhatsApp</h2>
          <p className="mt-1 text-muted">Que quede escrito en el chat:</p>
          <ul className="list-disc pl-5 text-muted">
            <li>El precio y qué incluye.</li>
            <li>El día y la hora, y las dos direcciones.</li>
            <li>Quién carga y si hay escaleras.</li>
            <li>Cómo se paga y cuándo. Lo mejor es al entregar.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold">Si pagaste y no te cumplieron</h2>
          <ol className="mt-1 list-decimal pl-5 text-muted">
            <li>
              Llama de una vez a tu banco, a Nequi o a Daviplata y cuéntales lo que pasó. Si avisas rápido, a veces
              pueden frenar la plata.
            </li>
            <li>Guarda los pantallazos del chat, el número que te habló y el comprobante del pago.</li>
            <li>
              Denuncia por internet en{" "}
              <a className="underline" href="https://adenunciar.policia.gov.co/adenunciar/" target="_blank" rel="noopener noreferrer">
                ADenunciar
              </a>{" "}
              o pide orientación en el{" "}
              <a className="underline" href="https://caivirtual.policia.gov.co/" target="_blank" rel="noopener noreferrer">
                CAI Virtual
              </a>{" "}
              de la Policía.
            </li>
            <li>Bloquea el número en WhatsApp y no le mandes más plata, aunque te prometa devolverla.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-bold">Si se quedaron con tus cosas o con tu carro</h2>
          <p className="mt-1 text-muted">
            Llama al 123 y denuncia en ADenunciar. Lleva la placa, la foto de la cédula y los pantallazos del chat:
            ayudan a encontrar a la persona.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Si eres transportista</h2>
          <ul className="mt-1 list-disc pl-5 text-muted">
            <li>Si te mostraron un pago que no te llegó, no entregues la carga hasta verlo en la app de tu banco.</li>
            <li>Si te citan en un lugar solo o raro, no vayas. Pide que se vean en un lugar con gente.</li>
            <li>
              Si te piden llevar algo que no te dejan ver, no lo lleves. Si ya lo llevas y sospechas, llama al 123.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold">Preguntas</h2>
          <div className="mt-1 flex flex-col gap-2">
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question} className="card">
                <summary className="cursor-pointer font-semibold">{question}</summary>
                <p className="mt-2 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold">{NO_CHARGE_TIP}</h2>
          <p className="mt-1 text-muted">
            Si alguien dice que es de Mudavía y te pide plata, una inscripción o un código, es una estafa. No le
            pagues ni le mandes nada.
          </p>
        </section>

        <p className="text-muted">
          Mira también{" "}
          <Link href="/privacidad" className="underline">
            cómo cuidamos tus datos
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

/** Las preguntas de siempre, con la respuesta corta. */
const QUESTIONS = [
  {
    question: "¿Cuánto cuesta Mudavía?",
    answer: "Nada. Mudavía no cobra ni pone el precio: lo acuerdan el cliente y el transportista cuando hablan.",
  },
  {
    question: "¿Por qué no me sale ningún transportista?",
    answer:
      "Solo te salen los transportistas que van por tu camino y tienen espacio para lo que vas a mover. Tu solicitud queda guardada: entra a Mudavía cada tanto para mirar.",
  },
  {
    question: "¿Cómo cierro mi solicitud o dejo de salirles a los clientes?",
    answer:
      "Si pediste un transportista, toca “Ya no necesito este servicio”. Si eres transportista, toca “Ya no estoy disponible”.",
  },
  {
    question: "Soy transportista: ¿por qué no veo el teléfono de los clientes?",
    answer:
      "Para cuidar a los clientes, ellos son los que te llaman o te escriben. Su número lo ves cuando te contactan.",
  },
  {
    question: "¿Qué pasa con mi número?",
    answer:
      "Si pides un transportista, no te lo pedimos. Si eres transportista, lo ven los clientes de tu camino, y lo borramos poco después de que tocas “Ya no estoy disponible”.",
  },
] as const;
