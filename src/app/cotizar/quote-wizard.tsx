"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { requestQuote, type DriverMatch } from "@/app/actions";
import { CitySelect, Choices, ErrorNote, Field, WhatsAppButton, useBogotaDates } from "@/components/ui";
import { getCity } from "@/lib/cities";
import {
  CLIENT_LABOR,
  DRIVER_LABOR,
  DRIVER_SPACES,
  TIME_SLOTS,
  VEHICLE_TYPES,
  VOLUMES,
  type ClientLabor,
  type Volume,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { estimate, formatCOP, type Quote } from "@/lib/pricing";
import { waLink } from "@/lib/whatsapp";

const STEPS = ["La ruta", "El volumen", "Ajustes", "Contacto"] as const;

export function QuoteWizard() {
  const { today, tomorrow } = useBogotaDates();
  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = pickedDate || today;
  const [volume, setVolume] = useState<Volume | "">("");
  const [labor, setLabor] = useState<ClientLabor>("yo_cargo");
  const [stairsOrigin, setStairsOrigin] = useState(0);
  const [stairsDestination, setStairsDestination] = useState(0);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ quote: Quote; matches: DriverMatch[] } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(load(KEYS.clientPhone, ""));
  }, []);

  // Estimación en vivo: el mismo cálculo que hace el servidor.
  const preview = useMemo(() => {
    if (!origin || !destination || !volume) return null;
    return estimate({ origin, destination, volume, labor, stairsOrigin, stairsDestination });
  }, [origin, destination, volume, labor, stairsOrigin, stairsDestination]);

  const canContinue = [Boolean(origin && destination && date), Boolean(volume), true, whatsapp.trim().length >= 7][step];

  function next(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    startTransition(async () => {
      const res = await requestQuote({
        origin,
        destination,
        date,
        volume,
        labor,
        stairsOrigin,
        stairsDestination,
        whatsapp,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      save(KEYS.clientPhone, whatsapp);
      setResult({ quote: res.quote, matches: res.matches });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (result) {
    return (
      <Results
        quote={result.quote}
        matches={result.matches}
        route={`${getCity(origin)?.name} → ${getCity(destination)?.name}`}
        onRestart={() => {
          setResult(null);
          setStep(0);
        }}
      />
    );
  }

  return (
    <form onSubmit={next} className="flex flex-col gap-6">
      <ol className="flex gap-1" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`}
          >
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-bold">
        {step + 1}. {STEPS[step]}
      </h2>

      {step === 0 && (
        <>
          <Field label="Origen">
            <CitySelect name="origin" value={origin} onChange={setOrigin} />
          </Field>
          <Field label="Destino" hint="Puede ser la misma ciudad si es un trasteo local.">
            <CitySelect name="destination" value={destination} onChange={setDestination} />
          </Field>
          <Field label="Fecha del servicio">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Hoy", today],
                ["Mañana", tomorrow],
              ].map(([label, value]) => (
                <button
                  key={value}
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

      {step === 1 && (
        <Field label="¿Qué vas a mover?">
          <Choices options={VOLUMES} value={volume} onChange={setVolume} columns={1} />
        </Field>
      )}

      {step === 2 && (
        <>
          {volume !== "sobres" && (
            <Field label="¿Necesitas ayuda para cargar?">
              <Choices options={CLIENT_LABOR} value={labor} onChange={setLabor} columns={1} />
            </Field>
          )}
          <Stairs label="Escaleras en el origen" value={stairsOrigin} onChange={setStairsOrigin} />
          <Stairs label="Escaleras en el destino" value={stairsDestination} onChange={setStairsDestination} />
        </>
      )}

      {step === 3 && (
        <Field label="Tu WhatsApp" hint="Te conectamos con el transportista por WhatsApp.">
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

      {preview && (
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
          Precio estimado: <strong className="text-base">{formatCOP(preview.total)}</strong>
          <span className="text-muted"> · {preview.distanceKm} km aprox.</span>
        </div>
      )}

      <ErrorNote message={error} />
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={!canContinue || isPending}>
          {step < STEPS.length - 1 ? "Continuar" : isPending ? "Buscando…" : "Ver precio y transportistas"}
        </button>
      </div>
    </form>
  );
}

function Stairs({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value === 0}
          onClick={() => onChange(0)}
          className={`rounded-xl border px-3 py-3 text-sm ${
            value === 0 ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-surface"
          }`}
        >
          Planta baja o ascensor
        </button>
        <label
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            value > 0 ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-surface"
          }`}
        >
          Pisos
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={value || ""}
            placeholder="0"
            onChange={(e) => onChange(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
            className="w-full bg-transparent text-right font-semibold outline-none"
          />
        </label>
      </div>
    </Field>
  );
}

function Results({
  quote,
  matches,
  route,
  onRestart,
}: {
  quote: Quote;
  matches: DriverMatch[];
  route: string;
  onRestart: () => void;
}) {
  const hasRoute = matches.some((m) => m.kind === "ruta");
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <p className="text-sm">{route}</p>
        <p className="mt-1 text-3xl font-bold">{formatCOP(hasRoute ? quote.routeTotal : quote.total)}</p>
        {hasRoute && (
          <p className="text-sm">
            Precio con descuento por ruta programada (tarifa normal {formatCOP(quote.total)}).
          </p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-brand-ink/80">
          <dt>Tarifa base</dt>
          <dd className="text-right">{formatCOP(quote.base)}</dd>
          <dt>Distancia ({quote.distanceKm} km)</dt>
          <dd className="text-right">{formatCOP(quote.distance)}</dd>
          {quote.labor > 0 && (
            <>
              <dt>Mano de obra</dt>
              <dd className="text-right">{formatCOP(quote.labor)}</dd>
            </>
          )}
          {quote.stairs > 0 && (
            <>
              <dt>Escaleras</dt>
              <dd className="text-right">{formatCOP(quote.stairs)}</dd>
            </>
          )}
        </dl>
        <p className="mt-3 text-xs text-brand-ink/70">
          Es un estimado. El precio final lo acuerdas con el transportista.
        </p>
      </section>

      {matches.length === 0 ? (
        <section className="card">
          <h2 className="font-semibold">Guardamos tu solicitud</h2>
          <p className="mt-1 text-sm text-muted">
            Ahora mismo no hay transportistas disponibles para esa ruta y fecha. Apenas uno publique
            disponibilidad en tu zona verá tu solicitud y te escribirá por WhatsApp.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Transportistas disponibles ({matches.length})</h2>
          {matches.map((m) => (
            <article key={m.id} className="card">
              <p className="font-semibold">
                {VEHICLE_TYPES[m.vehicle_type]} · {DRIVER_SPACES[m.space]}
              </p>
              <p className="text-sm text-muted">
                {m.kind === "ruta"
                  ? `Va de ${getCity(m.origin_city)?.name} a ${getCity(m.destination_city)?.name}`
                  : `Disponible en ${getCity(m.origin_city)?.name}`}{" "}
                · {TIME_SLOTS[m.time_slot]} · {DRIVER_LABOR[m.labor]}
              </p>
              <div className="mt-3">
                <WhatsAppButton
                  href={waLink(
                    m.whatsapp,
                    `Hola, te encontré en Muvia. Necesito un servicio ${route}. ¿Tienes disponibilidad?`,
                  )}
                >
                  Escribir por WhatsApp
                </WhatsAppButton>
              </div>
            </article>
          ))}
        </section>
      )}

      <button type="button" className="btn-secondary" onClick={onRestart}>
        Hacer otra cotización
      </button>
    </div>
  );
}
