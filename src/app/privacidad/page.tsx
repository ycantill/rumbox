import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_CONTACT, PRIVACY_UPDATED } from "@/lib/legal";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Cómo cuidamos sus datos",
};

// Política de tratamiento de datos (Ley 1581 de 2012), en palabras simples.
export default function PrivacyPage() {
  const { name, email, phone } = PRIVACY_CONTACT;
  return (
    <main className="page">
      <TrackVisit page="privacidad" />
      <Link href="/" className="text-[15px] text-muted">
        ← Inicio
      </Link>
      <h1 className="title mb-6 mt-4">Cómo cuidamos sus datos</h1>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="card-title">Quién guarda sus datos</h2>
          <p className="mt-1 text-muted">
            {name}. Si tiene una pregunta o quiere que borremos sus datos, escríbanos a{" "}
            <a className="text-brand underline" href={`mailto:${email}`}>
              {email}
            </a>{" "}
            o llámenos al{" "}
            <a className="text-brand underline" href={`tel:+57${phone.replace(/\D/g, "")}`}>
              {phone}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="card-title">Qué guardamos</h2>
          <ul className="mt-1 list-disc pl-5 text-muted">
            <li>Si usted va de viaje, su teléfono. Si necesita un servicio, no se lo pedimos.</li>
            <li>De dónde sale, hacia dónde va y qué día.</li>
            <li>Qué servicio necesita y qué tan grande es, o qué servicios hace y cuánto espacio tiene.</li>
            <li>Una huella de su conexión a internet, para frenar a quien abusa de la app. No guardamos su dirección de internet.</li>
          </ul>
          <p className="mt-2 text-muted">
            También contamos cuántas veces se abre cada pantalla y se tocan los botones de llamar y de WhatsApp,
            para saber si la app sirve, y Vercel, donde vive la app, cuenta las visitas y de qué página llegan. Nada
            de eso dice quién fue ni usa cookies.
          </p>
          <p className="mt-2 text-muted">
            Para saber por qué carretera va el conductor, le preguntamos el camino entre sus dos municipios a
            OpenRouteService, que usa los mapas de OpenStreetMap. No le mandamos su teléfono ni nada suyo.
          </p>
          <p className="mt-2 text-muted">
            Si el conductor toca &ldquo;Comenzar viaje en Maps&rdquo;, se abre Google Maps (o Mapas, en iPhone) con
            su destino. Lo que haga ahí lo manejan Google o Apple y no vuelve a Rumbox.
          </p>
          <p className="mt-2 text-muted">No pedimos su nombre, su cédula ni su ubicación.</p>
        </section>

        <section>
          <h2 className="card-title">Para qué los usamos</h2>
          <p className="mt-1 text-muted">
            Solo para juntar a quien necesita un servicio con conductores que van para allá. No vendemos sus datos ni
            los usamos para publicidad.
          </p>
        </section>

        <section>
          <h2 className="card-title">Quién ve su teléfono</h2>
          <p className="mt-1 text-muted">
            Si necesita un servicio, no se lo pedimos. Usted decide a quién llamar o escribir, y solo ese conductor ve
            su número.
          </p>
          <p className="mt-1 text-muted">
            Si usted va de viaje, lo ven las personas que buscan un viaje como el suyo, para llamarlo o escribirle
            por WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="card-title">Cuánto tiempo los guardamos</h2>
          <p className="mt-1 text-muted">
            El teléfono del conductor se borra cuando su viaje deja de valer, poco después de que lo apaga. Las
            solicitudes de antes que guardaron un teléfono también lo borran al dejar de valer.
          </p>
        </section>

        <section>
          <h2 className="card-title">Sus derechos</h2>
          <p className="mt-1 text-muted">
            Puede pedirnos ver sus datos, corregirlos o borrarlos, y retirar su permiso cuando quiera. Le respondemos
            en máximo 10 días hábiles si es una pregunta y 15 si es un reclamo. Si no le respondemos, puede quejarse
            ante la Superintendencia de Industria y Comercio.
          </p>
        </section>

        <p className="text-[13px] text-muted">Actualizado el {PRIVACY_UPDATED}.</p>
      </div>
    </main>
  );
}
