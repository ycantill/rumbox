"use client";

import { useEffect, useState, useTransition } from "react";
import { createRequest, type DriverMatch } from "@/app/actions";
import {
  CitySelect,
  Choices,
  ContactButtons,
  ErrorNote,
  Field,
  OriginCitySelect,
  useBogotaDates,
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
  type ClientLabor,
  type Volume,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { callServer } from "@/lib/server-call";
import { formatWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";

const STEPS = [
  { key: "ruta", title: "De dónde a dónde" },
  { key: "volumen", title: "Qué vas a mover" },
  { key: "ayuda", title: "Ayuda para cargar" },
  { key: "whatsapp", title: "Tu teléfono" },
] as const;

export function QuoteWizard() {
  const { today, tomorrow } = useBogotaDates();
  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = pickedDate || today;
  const [volume, setVolume] = useState<Volume | "">("");
  const [labor, setLabor] = useState<ClientLabor>("yo_cargo");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<DriverMatch[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(load(KEYS.clientPhone, ""));
  }, []);

  // Para sobres no hay nada que preguntar de ayuda para cargar: ese paso se salta.
  const steps = volume === "sobres" ? STEPS.filter((s) => s.key !== "ayuda") : STEPS;
  const current = steps[step].key;
  const sameCity = Boolean(origin) && origin === destination;
  const canContinue = {
    ruta: Boolean(origin && destination && date) && !sameCity,
    volumen: Boolean(volume),
    ayuda: true,
    whatsapp: whatsapp.trim().length >= 7,
  }[current];

  function next(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    startTransition(async () => {
      const res = await callServer(() => createRequest({ origin, destination, date, volume, labor, whatsapp }));
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
        phone={normalizeWhatsApp(whatsapp)}
        onRestart={() => {
          setMatches(null);
          setStep(0);
        }}
      />
    );
  }

  return (
    <form onSubmit={next} className="flex flex-col gap-6">
      <ol className="flex gap-1" aria-label="Pasos">
        {steps.map((s, i) => (
          <li
            key={s.key}
            aria-current={i === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`}
          >
            <span className="sr-only">{s.title}</span>
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-bold">
        {step + 1}. {steps[step].title}
      </h2>

      {current === "ruta" && (
        <>
          <Field label="¿Desde dónde?">
            <OriginCitySelect name="origin" value={origin} onChange={setOrigin} exclude={destination} />
          </Field>
          <Field label="¿Hacia dónde?">
            {/* El origen no sale en la lista. Aun así "Ubicarme" puede dejar los dos iguales: ahí sale el aviso. */}
            <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} />
            <ErrorNote message={sameCity ? SAME_CITY_ERROR : null} />
          </Field>
          <Field label="¿Qué día?">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Hoy", today],
                ["Mañana", tomorrow],
              ].map(([label, value]) => (
                <button
                  // Por el texto y no por la fecha: en el HTML del servidor las dos fechas
                  // llegan vacías, y con la misma clave React duplicaba "Hoy".
                  key={label}
                  type="button"
                  aria-pressed={date === value}
                  onClick={() => setDate(value)}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    date === value ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
              <input
                type="date"
                className="input"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Otra fecha"
              />
            </div>
          </Field>
        </>
      )}

      {current === "volumen" && (
        <Field label="¿Qué vas a mover?">
          <Choices options={VOLUMES} value={volume} onChange={setVolume} columns={1} />
        </Field>
      )}

      {current === "ayuda" && (
        <Field label="¿Necesitas ayuda para cargar?">
          <Choices options={CLIENT_LABOR} value={labor} onChange={setLabor} columns={1} />
        </Field>
      )}

      {current === "whatsapp" && (
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
      )}

      <ErrorNote message={error} />
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={!canContinue || isPending}>
          {step < steps.length - 1 ? "Continuar" : isPending ? "Buscando…" : "Buscar transportista"}
        </button>
      </div>
    </form>
  );
}

function Results({
  matches,
  route,
  when,
  phone,
  onRestart,
}: {
  matches: DriverMatch[];
  route: string;
  when: string;
  /** El teléfono del cliente como quedó guardado, para que vea si está bien. */
  phone: string | null;
  onRestart: () => void;
}) {
  // No hay precio: lo acuerdan el cliente y el transportista cuando hablan.
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <p className="font-semibold">{route}</p>
        <p className="text-sm">{capitalize(when)}</p>
      </section>

      {matches.length === 0 ? (
        <section className="card">
          <h2 className="font-semibold">Guardamos tu solicitud</h2>
          <p className="mt-1 text-sm text-muted">
            Ahora mismo no hay transportistas libres para ese viaje y ese día. Apenas aparezca uno, verá
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
                  message={`Hola, te encontré en Muvia. Necesito un servicio ${route} para ${when}. ¿Me puedes ayudar?`}
                />
              </div>
            </article>
          ))}
        </section>
      )}

      <button type="button" className="btn-secondary" onClick={onRestart}>
        Buscar para otro viaje
      </button>
    </div>
  );
}
