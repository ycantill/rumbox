"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { getCity, searchCities, simplify, type City } from "@/lib/cities";

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

/**
 * Buscador de municipios. Con todos los de Colombia, una lista desplegable no
 * sirve: la persona escribe parte del nombre, con o sin tildes, y toca uno de
 * los que coinciden. Antes de escribir no se sugiere nada. Sigue el patrón
 * "combobox" de WAI-ARIA, así que también funciona con teclado y con lector de
 * pantalla.
 */
export function CitySelect({
  value,
  onChange,
  placeholder = "Escribe el municipio",
  allowEmpty,
  name,
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  name: string;
}) {
  const listId = useId();
  // null: no está escribiendo y el campo muestra el municipio elegido. El ref
  // guarda lo mismo para leerlo al salir del campo sin esperar otro render.
  const [query, setQueryState] = useState<string | null>(null);
  const queryRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);
  const selected = getCity(value);
  const open = query !== null;
  const results = query ? searchCities(query) : [];

  function setQuery(q: string | null) {
    queryRef.current = q;
    setQueryState(q);
    setActive(0);
  }

  function pick(city: City) {
    onChange(city.slug);
    setQuery(null);
    // Se cierra el teclado del celular para que vea el resto del formulario.
    inputRef.current?.blur();
  }

  function leave() {
    const typed = queryRef.current;
    if (typed === null) return;
    setQuery(null);
    if (!simplify(typed)) {
      // Borró el texto: si el campo es opcional, queda sin municipio.
      if (allowEmpty && value) onChange("");
      return;
    }
    // Escribió el nombre completo y no lo tocó en la lista: se toma igual.
    const exact = searchCities(typed).find((c) => simplify(c.name) === simplify(typed));
    if (exact) onChange(exact.slug);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      // Enter elige de la lista en vez de enviar el formulario.
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  }

  const showClear = allowEmpty && selected && !open;
  return (
    <div className="relative w-full min-w-0">
      <input
        ref={inputRef}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={`input ${showClear ? "pr-20" : ""}`}
        placeholder={placeholder}
        value={query ?? selected?.name ?? ""}
        required={!allowEmpty}
        onFocus={(e) => {
          setQuery(selected?.name ?? "");
          e.currentTarget.select();
          // En el celular el teclado tapa la parte de abajo: se sube el campo para ver la lista.
          const input = e.currentTarget;
          if (window.matchMedia("(max-width: 640px)").matches) {
            setTimeout(() => input.scrollIntoView({ block: "start", behavior: "smooth" }), 300);
          }
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={leave}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-muted"
        >
          Quitar
        </button>
      )}
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          {results.map((c, i) => (
            <li
              key={c.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Sin esto, el campo pierde el foco antes del toque y la lista se cierra.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              className={`flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2.5 text-sm ${
                i === active ? "bg-brand-soft text-brand-ink" : "text-ink"
              }`}
            >
              <span className="font-medium">{c.name}</span>
              {!c.name.endsWith(`(${c.department})`) && (
                <span className="shrink-0 text-xs text-muted">{c.department}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() !== "" && results.length === 0 && (
        <p
          role="status"
          className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted shadow-lg"
        >
          No encontramos ese municipio. Revisa cómo lo escribiste.
        </p>
      )}
    </div>
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
