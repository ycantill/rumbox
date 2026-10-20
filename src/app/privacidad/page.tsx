import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_CONTACT, PRIVACY_UPDATED } from "@/lib/legal";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Cómo cuidamos tus datos",
};

// Política de tratamiento de datos (Ley 1581 de 2012), en palabras simples.
export default function PrivacyPage() {
  const { name, email, phone } = PRIVACY_CONTACT;
  return (
    <main className="page">
      <TrackVisit page="privacidad" />
      <Link href="/" className="text-sm text-muted">
        ← Inicio
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">Cómo cuidamos tus datos</h1>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-bold">Quién guarda tus datos</h2>
          <p className="mt-1 text-muted">
            {name}. Si tienes una pregunta o quieres que borremos tus datos, escríbenos a{" "}
            <a className="underline" href={`mailto:${email}`}>
              {email}
            </a>{" "}
            o llámanos al{" "}
            <a className="underline" href={`tel:+57${phone.replace(/\D/g, "")}`}>
              {phone}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Qué guardamos</h2>
          <ul className="mt-1 list-disc pl-5 text-muted">
            <li>Tu teléfono.</li>
            <li>De dónde sales, hacia dónde vas y qué día.</li>
            <li>Qué vas a mover o cuánto puedes llevar, y si hay ayuda para cargar.</li>
            <li>Una huella de tu conexión a internet, para frenar a quien abusa de la app. No guardamos tu dirección de internet.</li>
            <li>Si pides que te avisemos, lo que necesita tu celular para recibir el aviso.</li>
            <li>A qué transportistas tocaste para llamar o escribir, y si el transportista te va a llevar.</li>
          </ul>
          <p className="mt-2 text-muted">
            También contamos cuántas veces se abre cada pantalla y se tocan los botones de llamar y de WhatsApp,
            para saber si la app sirve, y Vercel, donde vive la app, cuenta las visitas y de qué página llegan. Nada
            de eso dice quién fue ni usa cookies.
          </p>
          <p className="mt-2 text-muted">No pedimos tu nombre, tu cédula ni tu ubicación exacta.</p>
        </section>

        <section>
          <h2 className="text-base font-bold">Para qué los usamos</h2>
          <p className="mt-1 text-muted">
            Solo para juntar a quien necesita mover algo con transportistas que van para allá, y para avisarte
            cuando aparece uno, si lo pediste. No vendemos tus datos ni los usamos para publicidad.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Quién ve tu teléfono</h2>
          <p className="mt-1 text-muted">
            Si necesitas mover algo, nadie: los transportistas no ven tu teléfono. Tú decides a quién llamar o
            escribir. Cuando tocas llamar o escribir a un transportista, él ve tu solicitud (de dónde a dónde, qué
            vas a mover y la ayuda que pides) y los dos últimos números de tu teléfono, para reconocerte cuando le
            escribas.
          </p>
          <p className="mt-1 text-muted">
            Si eres transportista, lo ven las personas que buscan un viaje como el tuyo, para llamarte o escribirte
            por WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Cuánto tiempo los guardamos</h2>
          <p className="mt-1 text-muted">
            Tu teléfono, y a qué transportistas tocaste, se borran cuando tu solicitud o tu viaje deja de valer: el
            día después del viaje, o poco después de que lo cierras.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Tus derechos</h2>
          <p className="mt-1 text-muted">
            Puedes pedirnos ver tus datos, corregirlos o borrarlos, y retirar tu permiso cuando quieras. Te
            respondemos en máximo 10 días hábiles si es una pregunta y 15 si es un reclamo. Si no te respondemos,
            puedes quejarte ante la Superintendencia de Industria y Comercio.
          </p>
        </section>

        <p className="text-xs text-muted">Actualizado el {PRIVACY_UPDATED}.</p>
      </div>
    </main>
  );
}
