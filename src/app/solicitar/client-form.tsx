"use client";

import { useEffect, useState, useTransition } from "react";
import { createRequest, type DriverMatch } from "@/app/actions";
import {
  CitySelect,
  Choices,
  ContactButtons,
  DayPicker,
  ErrorNote,
  Field,
  OriginCitySelect,
  useBogotaDates,
  useDayAndSlot,
} from "@/components/ui";
import { getCity } from "@/lib/cities";
import { capitalize, whenText } from "@/lib/dates";
import {
  CLIENT_LABOR,
  DRIVER_LABOR,
  SAME_CITY_ERROR,
  TIME_SLOTS,
  VOLUMES,
  spaceInSentence,
  withSlot,
  type ClientLabor,
  type TimeSlot,
  type Volume,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { callServer } from "@/lib/server-call";
import { formatWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";

/** Todo en una sola pantalla, con las mismas preguntas y el mismo orden que el transportista. */
export function ClientForm() {
  const { today, tomorrow } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  // Solo le salen transportistas de la misma jornada; "Todo el día" coincide con todas.
  const [pickedSlot, setTimeSlot] = useState<TimeSlot | "">("todo_el_dia");
  const { date, timeSlot, todayOpen, slotOptions } = useDayAndSlot(pickedDate, pickedSlot);
  const [volume, setVolume] = useState<Volume | "">("");
  const [labor, setLabor] = useState<ClientLabor | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<DriverMatch[] | null>(null);
  const [isPending, startTransition] = useTransition();
  // Para paquetes o sobres no hay nada que preguntar de ayuda para cargar.
  const asksLabor = volume !== "sobres";

  useEffect(() => {
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(load(KEYS.clientPhone, ""));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await callServer(() =>
        createRequest({
          origin,
          destination,
          date,
          timeSlot,
          volume,
          labor: asksLabor ? labor : "yo_cargo",
          whatsapp,
        }),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      save(KEYS.clientPhone, whatsapp);
      setMatches(res.matches);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (matches) {
    return (
      <Results
        matches={matches}
        route={`${getCity(origin)?.name} → ${getCity(destination)?.name}`}
        when={whenText(date, today, tomorrow)}
        timeSlot={timeSlot as TimeSlot}
        phone={normalizeWhatsApp(whatsapp)}
        onRestart={() => {
          // El formulario vuelve con los mismos datos, para cambiar solo lo que haga falta.
          setMatches(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="-mt-4 text-sm text-muted">
        Cuéntanos qué vas a mover, hacia dónde y qué día. No tienes que crear cuenta ni pagar comisiones.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="¿Desde dónde?">
          <OriginCitySelect name="origin" value={origin} onChange={setOrigin} exclude={destination} />
        </Field>

        <Field label="¿Hacia dónde?">
          {/* El origen no sale en la lista. Aun así "Ubicarme" puede dejar los dos iguales: ahí sale el aviso. */}
          <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} />
          <ErrorNote message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </Field>

        <Field label="¿Qué día?">
          <DayPicker value={date} onChange={setDate} todayOpen={todayOpen} />
          <Choices options={slotOptions} value={timeSlot} onChange={setTimeSlot} />
        </Field>

        {/* La misma lista de tamaños que elige el transportista. */}
        <Field label="¿Qué vas a mover?">
          <Choices options={VOLUMES} value={volume} onChange={setVolume} columns={1} />
        </Field>

        {asksLabor && (
          <Field label="¿Necesitas ayuda para cargar?">
            <Choices options={CLIENT_LABOR} value={labor} onChange={setLabor} columns={1} />
          </Field>
        )}

        <Field label="Tu teléfono" hint="El transportista te llama o te escribe por WhatsApp a este número.">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input"
            placeholder="300 123 4567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
        </Field>

        <ErrorNote message={error} />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Un momento…" : "Solicitar transportista"}
        </button>
      </form>
    </div>
  );
}

function Results({
  matches,
  route,
  when,
  timeSlot,
  phone,
  onRestart,
}: {
  matches: DriverMatch[];
  route: string;
  when: string;
  timeSlot: TimeSlot;
  /** El teléfono del cliente como quedó guardado, para que vea si está bien. */
  phone: string | null;
  onRestart: () => void;
}) {
  // No hay precio: lo acuerdan el cliente y el transportista cuando hablan.
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <p className="font-semibold">{route}</p>
        <p className="text-sm">
          {capitalize(when)} · {TIME_SLOTS[timeSlot]}
        </p>
      </section>

      {matches.length === 0 ? (
        <section className="card">
          <h2 className="font-semibold">Guardamos tu solicitud</h2>
          <p className="mt-1 text-sm text-muted">
            Ahora mismo no hay transportistas libres para ese viaje en ese momento. Apenas aparezca uno, verá
            tu pedido y te llamará o te escribirá por WhatsApp{phone ? ` al ${formatWhatsApp(phone)}` : ""}. El
            precio lo acuerdan cuando hablen.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">Transportistas libres ({matches.length})</h2>
            <p className="text-sm text-muted">Llama o escribe por WhatsApp y acuerden el precio.</p>
          </div>
          {matches.map((m) => (
            <article key={m.id} className="card">
              <p className="font-semibold">Puede llevar {spaceInSentence(m.space)}</p>
              <p className="text-sm text-muted">
                Va de {getCity(m.origin_city)?.name} a {getCity(m.destination_city)?.name} ·{" "}
                {TIME_SLOTS[m.time_slot]} · {DRIVER_LABOR[m.labor]}
              </p>
              <div className="mt-3">
                <ContactButtons
                  phone={m.whatsapp}
                  message={`Hola, te encontré en Muvia. Necesito un servicio ${route} para ${withSlot(when, timeSlot)}. ¿Me puedes ayudar?`}
                />
              </div>
            </article>
          ))}
        </section>
      )}

      <button type="button" className="btn-secondary" onClick={onRestart}>
        Hacer otra solicitud
      </button>
    </div>
  );
}
