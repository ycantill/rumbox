import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_CONTACT, PRIVACY_UPDATED } from "@/lib/legal";
import { Bullets, SupportHeader, SupportSection, SupportText } from "@/components/support";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Cómo cuidamos sus datos",
  description: "Qué datos guarda Rumbox, para qué y cuánto tiempo.",
};

const LINK = "font-semibold text-brand underline";

// Política de tratamiento de datos (Ley 1581 de 2012), en palabras simples.
export default function PrivacyPage() {
  const { name, email, phone } = PRIVACY_CONTACT;
  return (
    <main className="page flex flex-col gap-[22px] pb-9">
      <TrackVisit page="privacidad" />
      <SupportHeader
        back={
          <Link href="/" className="text-[15px] text-muted">
            ← Inicio
          </Link>
        }
      />
      <h1 className="title">Cómo cuidamos sus datos</h1>

      <section className="flex flex-col gap-2 rounded-lg border border-line bg-paper px-[18px] py-4">
        <h2 className="guide-label">Quién guarda sus datos</h2>
        <p className="text-base leading-relaxed">
          {name}. Si tiene una pregunta o quiere que borremos sus datos, escríbanos a{" "}
          <a className={LINK} href={`mailto:${email}`}>
            {email}
          </a>{" "}
          o llámenos al{" "}
          <a className={LINK} href={`tel:+57${phone.replace(/\D/g, "")}`}>
            {phone}
          </a>
          .
        </p>
      </section>

      <div className="flex flex-col gap-[22px]">
        <SupportSection title="Qué guardamos" first>
          <Bullets
            items={[
              "Si usted va de viaje, su teléfono. Si necesita un servicio, no se lo pedimos.",
              "De dónde sale, hacia dónde va y qué día.",
              "Qué servicio necesita y, si es una mudanza, qué tan grande es. Si usted va de viaje, qué servicios hace y cuánto espacio tiene.",
              "Una huella de su conexión a internet, para frenar a quien abusa de la app. No guardamos su dirección de internet.",
            ]}
          />
          <SupportText>
            También contamos cuántas veces se abre cada pantalla y se tocan los botones de llamar y de WhatsApp, para
            saber si la app sirve, y Vercel, donde vive la app, cuenta las visitas y de qué página llegan. Nada de eso
            dice quién fue ni usa cookies.
          </SupportText>
          <SupportText>
            Para saber por qué carretera va el conductor, le preguntamos el camino entre sus dos municipios a
            OpenRouteService, que usa los mapas de OpenStreetMap. No le mandamos su teléfono ni nada suyo.
          </SupportText>
          <SupportText>
            Si el conductor toca &ldquo;Comenzar viaje en Maps&rdquo;, se abre Google Maps (o Mapas, en iPhone) con su
            destino. Lo que haga ahí lo manejan Google o Apple y no vuelve a Rumbox.
          </SupportText>
          <SupportText strong>No pedimos su nombre, su cédula ni su ubicación.</SupportText>
        </SupportSection>

        <SupportSection title="Para qué los usamos">
          <SupportText>
            Solo para juntar a quien necesita un servicio con conductores que van para allá. No vendemos sus datos ni
            los usamos para publicidad.
          </SupportText>
        </SupportSection>

        <SupportSection title="Quién ve su teléfono">
          <div className="flex flex-col gap-2">
            <WhoSees label="Si necesita un servicio">
              Si necesita un servicio, no se lo pedimos. Usted decide a quién llamar o escribir, y solo ese conductor ve
              su número.
            </WhoSees>
            <WhoSees label="Si va de viaje">
              Si usted va de viaje, lo ven las personas que buscan un viaje como el suyo, para llamarlo o escribirle por
              WhatsApp.
            </WhoSees>
          </div>
        </SupportSection>

        <SupportSection title="Cuánto tiempo los guardamos">
          <SupportText>
            El teléfono del conductor se borra cuando su viaje deja de valer, poco después de que lo apaga. Las
            solicitudes de antes que guardaron un teléfono también lo borran al dejar de valer.
          </SupportText>
        </SupportSection>

        <SupportSection title="Sus derechos">
          <SupportText>
            Puede pedirnos ver sus datos, corregirlos o borrarlos, y retirar su permiso cuando quiera. Le respondemos
            en máximo 10 días hábiles si es una pregunta y 15 si es un reclamo. Si no le respondemos, puede quejarse
            ante la Superintendencia de Industria y Comercio.
          </SupportText>
        </SupportSection>
      </div>

      <p className="border-t border-line-soft pt-4 text-[13px] text-muted">Actualizado el {PRIVACY_UPDATED}.</p>
    </main>
  );
}

function WhoSees({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-line-soft bg-surface p-3.5">
      <h3 className="guide-label text-brand">{label}</h3>
      <p className="text-[15px] leading-normal text-[#4a5568]">{children}</p>
    </div>
  );
}
