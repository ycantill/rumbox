"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore } from "react";
import { CITIES_BY_DEPARTMENT, getCity, searchCities, simplify, type City } from "@/lib/cities";
import {
  ANY_DAY,
  ANY_DAY_LABEL,
  ANY_DESTINATION,
  ANY_DESTINATION_HINT,
  ANY_DESTINATION_LABEL,
} from "@/lib/domain";
import type { Page } from "@/lib/analytics";
import { KEYS, load, save } from "@/lib/local-store";
import { CLIENT_TIPS } from "@/lib/safety";
import { track } from "@/lib/track";
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
 * en un celular angosto.
 */
export function CitySelect({
  value,
  onChange,
  placeholder = "Escribe o elige",
  name,
  exclude,
  anyDestination = false,
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  name: string;
  /** Municipio que no sale en la lista porque ya está elegido en el otro campo. */
  exclude?: string;
  /** Destino del transportista: "Cualquier destino" va primero en la lista. */
  anyDestination?: boolean;
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
  const any = anyDestination ? ANY_OPTION : null;
  const selected = any && value === any.slug ? any : getCity(value);

  const searching = typed !== null && simplify(typed) !== "";
  const found = searching ? searchCities(typed) : [];
  const groups = exclude ? withoutCity(exclude) : CITIES_BY_DEPARTMENT;
  // "Cualquier destino" sale arriba de la lista completa y al buscarlo.
  const lead = any && (!searching || matchesAny(typed)) ? [any] : [];
  // En el orden en que se ven, para moverse con el teclado.
  const options = searching
    ? [...lead, ...found.filter((c) => c.slug !== exclude)]
    : browsing
      ? [...lead, ...groups.flatMap((d) => d.cities)]
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
    const index = selected ? [...lead, ...groups.flatMap((d) => d.cities)].indexOf(selected) : -1;
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
    const exact = [...(any ? [any] : []), ...searchCities(text)].find(
      (c) => c.slug !== exclude && simplify(c.name) === simplify(text),
    );
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
            ? options.map((c, i) =>
                option(c, i, c.name, c === any ? ANY_DESTINATION_HINT : c.name.endsWith(`(${c.department})`) ? undefined : c.department),
              )
            : (
                <>
                  {lead.map((c) => option(c, index++, c.name, ANY_DESTINATION_HINT))}
                  {groups.map(({ department, cities }, g) => (
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
                </>
              )}
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

/** "Cualquier destino" como una opción más de la lista, sin departamento ni lugar. */
const ANY_OPTION: City = { slug: ANY_DESTINATION, name: ANY_DESTINATION_LABEL, department: "", lat: 0, lng: 0 };

/** Si lo escrito busca "Cualquier destino": "cual", "destino", "cualquiera"… */
function matchesAny(text: string): boolean {
  const q = simplify(text);
  const label = simplify(ANY_DESTINATION_LABEL);
  return label.startsWith(q) || label.split(" ").some((w) => w.startsWith(q)) || q.startsWith("cualquier");
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

/**
 * El día que se ve elegido: el que tocó la persona o, si no tocó ninguno o el
 * que tenía guardado ya pasó, hoy.
 */
export function useServiceDay(pickedDate: string): string {
  const { today } = useBogotaDates();
  return pickedDate && pickedDate >= today ? pickedDate : today;
}

/**
 * El día: "Hoy", "Mañana" u otro en el calendario. No hay jornadas. El
 * cliente tiene además "Cualquier día" (`anyDay`), arriba y a lo ancho.
 */
export function DayPicker({
  value,
  onChange,
  anyDay = false,
}: {
  value: string;
  onChange: (date: string) => void;
  anyDay?: boolean;
}) {
  const { today, tomorrow } = useBogotaDates();
  return (
    <div className="grid grid-cols-3 gap-2">
      {anyDay && (
        <div className="col-span-3 grid">
          <QuickDate label={ANY_DAY_LABEL} value={ANY_DAY} current={value} onPick={onChange} />
        </div>
      )}
      <QuickDate label="Hoy" value={today} current={value} onPick={onChange} />
      <QuickDate label="Mañana" value={tomorrow} current={value} onPick={onChange} />
      <input
        type="date"
        className="input"
        min={today}
        value={value === ANY_DAY ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Otra fecha"
      />
    </div>
  );
}

function QuickDate({
  label,
  value,
  current,
  onPick,
}: {
  label: string;
  value: string;
  current: string;
  onPick: (v: string) => void;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onPick(value)}
      className={`rounded-xl border px-3 py-3 text-sm ${
        selected ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * El permiso para guardar los datos (Ley 1581 de 2012), justo antes del botón
 * que los envía, con el enlace a /privacidad.
 */
export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted">
      {children}{" "}
      <Link href="/privacidad" className="underline">
        Cómo cuidamos tus datos
      </Link>
    </p>
  );
}

/** Un aviso que no es un error, como que el viaje de antes ya pasó. */
export function InfoNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-ink">{message}</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

/**
 * Las dos formas de contactar a alguien: escribirle por WhatsApp, con el
 * mensaje listo, o llamarlo. Antes de cada contacto salen los consejos para
 * cuidarse (Yohany, 23 de octubre de 2026), y solo con "Entendido" sigue.
 */
export function ContactButtons({
  phone,
  message,
  availabilityId,
}: {
  phone: string;
  message: string;
  availabilityId: string;
}) {
  const [kind, setKind] = useState<"whatsapp" | "llamada" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function ask(next: "whatsapp" | "llamada") {
    setKind(next);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ask("whatsapp")}
          className="inline-flex items-center justify-center rounded-xl border border-transparent bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white"
        >
          Escribir por WhatsApp
        </button>
        <button
          type="button"
          onClick={() => ask("llamada")}
          className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink"
        >
          Llamar
        </button>
      </div>
      <dialog
        ref={dialogRef}
        onClose={() => setKind(null)}
        // Son solo consejos: no hay "Cancelar", pero tocar fuera de la
        // tarjeta (o el botón de atrás) la cierra sin seguir.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface p-0 text-ink backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold">Antes de {kind === "llamada" ? "llamar" : "escribir"}</h2>
          <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted">
            {CLIENT_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          {kind && (
            <a
              href={kind === "whatsapp" ? waLink(phone, message) : telLink(phone)}
              {...(kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => {
                track({ kind, availabilityId });
                close();
              }}
              className="btn-primary text-center"
            >
              Entendido
            </a>
          )}
        </div>
      </dialog>
    </>
  );
}

/** Cuenta que se abrió la pantalla, y si ese navegador ya había entrado antes. */
export function TrackVisit({ page }: { page: Page }) {
  useEffect(() => {
    const returning = load(KEYS.visited, false);
    save(KEYS.visited, true);
    track({ kind: "visita", page, returning });
  }, [page]);
  return null;
}

const noopSubscribe = () => () => {};
const bogotaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

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

/** Consejos de seguridad: Mudavía no maneja plata, así que lo que más ayuda es avisar antes. */
export function SafetyTips({ tips }: { tips: readonly string[] }) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className="font-semibold">Para cuidarte</h2>
      <ul className="grid list-disc gap-1 pl-5 text-sm text-muted">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <Link href="/ayuda" className="text-sm font-semibold underline">
        Qué hacer si te estafan
      </Link>
    </section>
  );
}

