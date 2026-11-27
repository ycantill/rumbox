import type { DriverMatch } from "@/app/actions";
import { ContactButtons } from "@/components/ui";
import { getCity } from "@/lib/cities";
import { ANY_DESTINATION, SERVICES } from "@/lib/domain";

/** Un conductor que le sirve: de dónde sale, si va directo o pasa por su destino, y cómo contactarlo. */
export function DriverCard({
  match,
  destination,
  to,
  leaves,
  message,
}: {
  match: DriverMatch;
  /** El destino de la solicitud. */
  destination: string;
  /** Su nombre, para mostrarlo. */
  to?: string;
  /** Cuándo sale el conductor: "hoy", "mañana" o la fecha. */
  leaves: string;
  /** El mensaje de WhatsApp ya escrito. */
  message: string;
}) {
  // ↑ Va directo a su destino (o a cualquiera); ↗ pasa por su destino y sigue.
  const anyDestination = match.destination_city === ANY_DESTINATION;
  const direct = anyDestination || match.destination_city === destination;
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-start gap-3.5 p-4">
        <span
          aria-hidden
          className={`grid size-11 shrink-0 place-items-center rounded-md font-display text-2xl font-black ${
            direct ? "bg-brand text-white" : "border border-line bg-accent text-ink"
          }`}
        >
          {direct ? "↑" : "↗"}
        </span>
        <div className="flex flex-col gap-[3px]">
          <p className="text-[17px] font-bold leading-snug">
            Sale {leaves} de {getCity(match.origin_city)?.name}
          </p>
          <p className="text-sm leading-snug text-muted">
            {anyDestination ? "va a cualquier destino" : direct ? `va a ${to}` : `pasa por ${to}`}
          </p>
          {match.services && (
            <p className="text-[13px] text-[#3a4558]">{match.services.map((s) => SERVICES[s].plural).join(" · ")}</p>
          )}
        </div>
      </div>
      <div className="border-t border-dashed border-line px-4 py-3">
        <ContactButtons availabilityId={match.id} phone={match.whatsapp} message={message} />
      </div>
    </article>
  );
}
