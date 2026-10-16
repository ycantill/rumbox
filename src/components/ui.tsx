"use client";

import { useSyncExternalStore } from "react";
import { CITIES } from "@/lib/cities";

const DEPARTMENTS = [...new Set(CITIES.map((c) => c.department))];

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold text-ink">{label}</legend>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

export function CitySelect({
  value,
  onChange,
  placeholder = "Elige un municipio",
  allowEmpty,
  name,
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  name: string;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      required={!allowEmpty}
    >
      <option value="">{placeholder}</option>
      {DEPARTMENTS.map((d) => (
        <optgroup key={d} label={d}>
          {CITIES.filter((c) => c.department === d).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function Choices<K extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Record<K, string | { label: string; hint?: string; icon?: React.ReactNode }>;
  value: K | "";
  onChange: (key: K) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={columns === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
      {(Object.keys(options) as K[]).map((key) => {
        const opt = options[key];
        const label = typeof opt === "string" ? opt : opt.label;
        const hint = typeof opt === "string" ? undefined : opt.hint;
        const icon = typeof opt === "string" ? undefined : opt.icon;
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`rounded-xl border px-3 py-3 text-sm transition ${
              icon ? "flex flex-col items-center gap-1.5 text-center" : "text-left"
            } ${
              selected
                ? "border-brand bg-brand-soft font-semibold text-brand-ink"
                : "border-line bg-surface text-ink hover:border-brand/50"
            }`}
          >
            {icon}
            {label}
            {hint && <span className="mt-0.5 block text-xs font-normal text-muted">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function WhatsAppButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white"
    >
      {children}
    </a>
  );
}

const noopSubscribe = () => () => {};
const bogotaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

const everyMinute = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const bogotaHour = () =>
  Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(
      new Date(),
    ),
  );

/** Hora actual en Colombia (0-23), o null en el HTML prerenderizado. Se refresca cada minuto. */
export function useBogotaHour(): number | null {
  return useSyncExternalStore(everyMinute, bogotaHour, () => null);
}

/**
 * Fecha de hoy y mañana en hora de Colombia (YYYY-MM-DD). Se calcula solo en el
 * navegador: en el HTML prerenderizado llegan vacías para no congelar una fecha
 * vieja en la página estática.
 */
export function useBogotaDates(): { today: string; tomorrow: string } {
  const today = useSyncExternalStore(noopSubscribe, bogotaToday, () => "");
  if (!today) return { today: "", tomorrow: "" };
  const t = new Date(`${today}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return { today, tomorrow: t.toISOString().slice(0, 10) };
}
