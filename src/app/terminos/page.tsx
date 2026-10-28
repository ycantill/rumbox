import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/one-at-a-time";
import { Bullets, SupportHeader, SupportSection, SupportText } from "@/components/support";
import { PRIVACY_CONTACT, TERMS_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Las reglas para usar Rumbox: qué hace, qué no hace y qué no se permite.",
};

const LINK = "font-semibold text-brand underline";

// Términos y condiciones, en palabras simples. Es un borrador: conviene que
// alguien que conozca la ley lo revise antes de abrir al público
// (docs/pendientes.md, punto 10b).
export default function TermsPage() {
  const { name, email, phone } = PRIVACY_CONTACT;
  return (
    <main className="page flex flex-col gap-[22px] pb-9">
      <SupportHeader back={<BackLink />} />
      <h1 className="title">Términos y condiciones</h1>

      <p className="text-base leading-relaxed text-[#4a5568]">
        Al usar Rumbox, usted acepta estas reglas. Si no está de acuerdo, no use la app.
      </p>

      <div className="flex flex-col gap-[22px]">
        <SupportSection title="Qué hace Rumbox" first>
          <SupportText>
            Rumbox pone en contacto a quien necesita una mudanza, un flete, una encomienda, un encargo o una diligencia
            con conductores que ya van de viaje y tienen espacio. Nada más.
          </SupportText>
          <SupportText>
            Rumbox no es una empresa de transporte, no presta el servicio y no hace parte del acuerdo entre usted y el
            conductor.
          </SupportText>
        </SupportSection>

        <SupportSection title="No cobramos">
          <SupportText>
            Usar Rumbox no cuesta. El precio, la forma de pago, la hora y los detalles del servicio los acuerdan usted y
            el conductor cuando hablan. Rumbox no recibe ni guarda pagos.
          </SupportText>
          <SupportText strong>
            Si alguien le pide plata a nombre de Rumbox, es una estafa.{" "}
            <Link href="/ayuda" className={LINK}>
              Qué hacer si lo estafan
            </Link>
          </SupportText>
        </SupportSection>

        <SupportSection title="Lo que Rumbox no revisa">
          <Bullets
            items={[
              "No revisamos quién es cada persona, ni su vehículo, ni sus papeles.",
              "No revisamos lo que se lleva.",
              "No respondemos por pérdidas, daños, demoras, pagos ni por un servicio que no se cumpla. Eso queda entre usted y la otra persona.",
            ]}
          />
          <SupportText>Antes de entregar algo o de pagar, hable con la persona y pónganse de acuerdo por escrito.</SupportText>
        </SupportSection>

        <SupportSection title="Si usted va de viaje">
          <Bullets
            items={[
              "Ponga solo su propio teléfono.",
              "Diga la verdad sobre hacia dónde va, qué día y qué servicios hace.",
              "Usted responde por tener los papeles que pida la ley para el servicio que hace y por cuidar lo que lleva.",
              "Apague su viaje con “Ya no estoy disponible” cuando ya no pueda llevar nada.",
            ]}
          />
        </SupportSection>

        <SupportSection title="Lo que no se permite">
          <Bullets
            items={[
              "Poner el teléfono de otra persona o datos falsos.",
              "Pedir o llevar cosas prohibidas por la ley, como drogas, armas o contrabando.",
              "Cobrar a nombre de Rumbox o usar la app para engañar a alguien.",
              "Llenar la app de viajes o solicitudes falsas, o usarla para juntar teléfonos.",
            ]}
          />
          <SupportText>Si alguien no cumple estas reglas, podemos quitar su viaje o su solicitud sin avisarle.</SupportText>
        </SupportSection>

        <SupportSection title="Sus datos">
          <SupportText>
            Lo que guardamos y por cuánto tiempo está en{" "}
            <Link href="/privacidad" className={LINK}>
              cómo cuidamos sus datos
            </Link>
            .
          </SupportText>
        </SupportSection>

        <SupportSection title="Cambios">
          <SupportText>
            La app puede cambiar, fallar o dejar de estar en línea por un tiempo. Si cambiamos estas reglas, lo verá
            aquí con la fecha nueva.
          </SupportText>
        </SupportSection>

        <SupportSection title="Contacto">
          <SupportText>
            {name}. Escríbanos a{" "}
            <a className={LINK} href={`mailto:${email}`}>
              {email}
            </a>{" "}
            o llámenos al{" "}
            <a className={LINK} href={`tel:+57${phone.replace(/\D/g, "")}`}>
              {phone}
            </a>
            . Estas reglas se rigen por las leyes de Colombia.
          </SupportText>
        </SupportSection>
      </div>

      <p className="border-t border-line-soft pt-4 text-[13px] text-muted">Actualizado el {TERMS_UPDATED}.</p>
    </main>
  );
}
