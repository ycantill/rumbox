"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore } from "react";
import { CITIES_BY_DEPARTMENT, getCity, nearestCity, searchCities, simplify, type City } from "@/lib/cities";
import { telLink, waLink } from "@/lib/whatsapp";

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
 * Campo de municipio. Con todos los de Colombia hay dos formas de elegir:
 * escribir parte del nombre, con o sin tildes, y tocar uno de los que coinciden,
 * o tocar la flecha y buscarlo al ojo en la lista completa, agrupada por
 * departamento. Al tocar el campo no se sugiere nada. Sigue el patrón
 * "combobox" de WAI-ARIA, así que también funciona con teclado y con lector de
 * pantalla.
 *
 * El texto de ayuda invita a las dos formas y es corto para que quepa entero
 * en un celular angosto, también con el botón "Ubicarme" al lado.
 */
export function CitySelect({
  value,
  onChange,
  placeholder = "Escribe o elige",
  name,
  exclude,
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  name: string;
  /** Municipio que no sale en la lista porque ya está elegido en el otro campo. */
  exclude?: string;
}) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Lo que escribió desde que entró al campo; null mientras no escribe y el
  // campo muestra el municipio elegido. El ref guarda lo mismo para leerlo al
  // salir del campo sin esperar otro render.
  const [typed, setTypedState] = useState<string | null>(null);
  const typedRef = useRef<string | null>(null);
  // La lista completa, que se abre con la flecha (o con ↓ desde el teclado).
  const [browsing, setBrowsing] = useState(false);
  const [active, setActive] = useState(0);
  const selected = getCity(value);

  const searching = typed !== null && simplify(typed) !== "";
  const found = searching ? searchCities(typed) : [];
  const groups = exclude ? withoutCity(exclude) : CITIES_BY_DEPARTMENT;
  // En el orden en que se ven, para moverse con el teclado.
  const options = searching
    ? found.filter((c) => c.slug !== exclude)
    : browsing
      ? groups.flatMap((d) => d.cities)
      : [];
  const open = searching || browsing;

  function setTyped(text: string | null) {
    typedRef.current = text;
    setTypedState(text);
  }

  // En el celular, el campo sube para que la lista quepa debajo (y encima del teclado).
  function liftOnPhone(delay: number) {
    const wrapper = wrapperRef.current;
    if (wrapper && window.matchMedia("(max-width: 640px)").matches) {
      setTimeout(() => wrapper.scrollIntoView({ block: "start", behavior: "smooth" }), delay);
    }
  }

  function openList() {
    setTyped(null);
    setBrowsing(true);
    // Sin municipio elegido no se resalta ninguno: nada de sugerir.
    const index = selected ? groups.flatMap((d) => d.cities).indexOf(selected) : -1;
    setActive(index);
    // Si ya había uno elegido, la lista abre mostrándolo.
    requestAnimationFrame(() => {
      const list = listRef.current;
      const option = document.getElementById(`${listId}-${index}`);
      if (list && option) list.scrollTop = option.offsetTop - list.clientHeight / 2;
    });
    liftOnPhone(0);
  }

  function close() {
    const text = typedRef.current;
    setTyped(null);
    setBrowsing(false);
    if (text === null || !simplify(text)) return;
    // Escribió el nombre completo y no lo tocó en la lista: se toma igual.
    const exact = searchCities(text).find((c) => c.slug !== exclude && simplify(c.name) === simplify(text));
    if (exact) onChange(exact.slug);
  }

  function pick(city: City) {
    onChange(city.slug);
    setTyped(null);
    setBrowsing(false);
    // Se cierra el teclado del celular para que vea el resto del formulario.
    inputRef.current?.blur();
  }

  // Tocar fuera cierra la lista, también cuando se abrió con la flecha y el
  // campo no tenía el foco (entonces no hay "blur" que la cierre).
  const onOutside = useEffectEvent((e: PointerEvent) => {
    if (!wrapperRef.current?.contains(e.target as Node)) close();
  });
  const listening = open || typed !== null;
  useEffect(() => {
    if (!listening) return;
    const handler = (e: PointerEvent) => onOutside(e);
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [listening]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length === 0) return;
      const down = e.key === "ArrowDown";
      const next =
        active < 0 ? (down ? 0 : options.length - 1) : (active + (down ? 1 : -1) + options.length) % options.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      // Enter elige de la lista en vez de enviar el formulario.
      e.preventDefault();
      if (options[active]) pick(options[active]);
    } else if (e.key === "Escape") {
      setTyped(null);
      setBrowsing(false);
    }
  }

  function option(city: City, index: number, label: string, hint?: string) {
    return (
      <li
        key={city.slug}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={index === active}
        // Sin esto, el campo pierde el foco antes del toque y la lista se cierra.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => pick(city)}
        className={`flex scroll-mt-8 cursor-pointer items-baseline justify-between gap-2 px-3 py-2.5 text-sm ${
          index === active ? "bg-brand-soft text-brand-ink" : "text-ink"
        }`}
      >
        <span className="font-medium">{label}</span>
        {hint && <span className="shrink-0 text-xs text-muted">{hint}</span>}
      </li>
    );
  }

  let index = 0;
  return (
    <div ref={wrapperRef} className="relative w-full min-w-0">
      <input
        ref={inputRef}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="input pr-12"
        placeholder={placeholder}
        value={typed ?? selected?.name ?? ""}
        required
        onFocus={(e) => {
          e.currentTarget.select();
          liftOnPhone(300);
        }}
        onChange={(e) => {
          setTyped(e.target.value);
          setBrowsing(false);
          setActive(0);
        }}
        onBlur={close}
        onKeyDown={onKeyDown}
      />
      <div className="absolute inset-y-0 right-1 flex items-center">
        <button
          type="button"
          aria-label={browsing ? "Cerrar la lista de municipios" : "Ver la lista de municipios"}
          aria-expanded={browsing}
          aria-controls={listId}
          // No le quita el foco al campo: si el teclado estaba abierto, sigue abierto.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (browsing ? close() : openList())}
          className="grid size-10 place-items-center rounded-lg text-muted"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-5 transition ${browsing ? "rotate-180" : ""}`}>
            <path
              d="M5 7.5l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {open && options.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-surface shadow-lg"
        >
          {searching
            ? options.map((c, i) => option(c, i, c.name, c.name.endsWith(`(${c.department})`) ? undefined : c.department))
            : groups.map(({ department, cities }, g) => (
                <li key={department} role="group" aria-labelledby={`${listId}-g${g}`}>
                  <div
                    id={`${listId}-g${g}`}
                    role="presentation"
                    className="sticky top-0 z-10 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted"
                  >
                    {department}
                  </div>
                  <ul role="none">
                    {cities.map((c) => option(c, index++, c.name.replace(` (${department})`, "")))}
                  </ul>
                </li>
              ))}
        </ul>
      )}
      {searching && options.length === 0 && (
        <p
          role="status"
          className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted shadow-lg"
        >
          {/* Si lo único que coincide es el que está fuera de la lista, no es que no exista. */}
          {found.length > 0 ? "Ese municipio ya lo elegiste. Elige otro." : "No encontramos ese municipio. Revisa cómo lo escribiste."}
        </p>
      )}
    </div>
  );
}

/**
 * Municipio de origen con el botón "Ubicarme", que elige el municipio más
 * cercano según la ubicación del teléfono.
 */
export function OriginCitySelect({
  value,
  onChange,
  name,
  exclude,
}: {
  value: string;
  onChange: (slug: string) => void;
  name: string;
  /** El destino ya elegido, que no sale en la lista. "Ubicarme" sí lo puede elegir. */
  exclude?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);

  function pick(slug: string) {
    onChange(slug);
    setFailed(false);
  }

  function locate() {
    setFailed(false);
    if (!navigator.geolocation) {
      setFailed(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(nearestCity(pos.coords.latitude, pos.coords.longitude).slug);
        setLocating(false);
      },
      () => {
        // No dio permiso, el teléfono no supo dónde está o se demoró: que elija de la lista.
        setLocating(false);
        setFailed(true);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <CitySelect name={name} value={value} onChange={pick} exclude={exclude} />
        <button type="button" onClick={locate} className="btn-secondary shrink-0" disabled={locating}>
          {locating ? "…" : "Ubicarme"}
        </button>
      </div>
      <ErrorNote message={failed ? "No pudimos saber dónde estás. Elige tu pueblo en la lista." : null} />
    </>
  );
}

/** La lista completa sin un municipio; si su departamento queda vacío, tampoco sale. */
function withoutCity(slug: string) {
  return CITIES_BY_DEPARTMENT.map((d) => ({ ...d, cities: d.cities.filter((c) => c.slug !== slug) })).filter(
    (d) => d.cities.length > 0,
  );
}

// Clases completas para que Tailwind las encuentre al compilar.
const GRID_COLUMNS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const;

export function Choices<K extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Record<K, string | { label: string; hint?: string }>;
  value: K | "";
  onChange: (key: K) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={`grid gap-2 ${GRID_COLUMNS[columns]}`}>
      {(Object.keys(options) as K[]).map((key) => {
        const opt = options[key];
        const label = typeof opt === "string" ? opt : opt.label;
        const hint = typeof opt === "string" ? undefined : opt.hint;
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
              selected
                ? "border-brand bg-brand-soft font-semibold text-brand-ink"
                : "border-line bg-surface text-ink hover:border-brand/50"
            }`}
          >
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

/** Las dos formas de contactar a alguien: escribirle por WhatsApp, con el mensaje listo, o llamarlo. */
export function ContactButtons({ phone, message }: { phone: string; message: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={waLink(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl border border-transparent bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white"
      >
        Escribir por WhatsApp
      </a>
      <a
        href={telLink(phone)}
        className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink"
      >
        Llamar
      </a>
    </div>
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
