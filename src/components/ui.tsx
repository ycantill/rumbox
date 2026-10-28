"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore } from "react";
import { CITIES_BY_DEPARTMENT, getCity, searchCities, simplify, type City } from "@/lib/cities";
import { addDays } from "@/lib/dates";
import {
  ANY_DAY,
  ANY_DAY_LABEL,
  ANY_DESTINATION,
  ANY_DESTINATION_HINT,
  ANY_DESTINATION_LABEL,
  CLIENT_SIZES,
  DRIVER_SPACES,
  MOVING_SPACES,
  SERVICES,
  type ClientSize,
  type DriverSpace,
  type MovingSpace,
  type Service,
} from "@/lib/domain";
import type { Page } from "@/lib/analytics";
import { KEYS, load, save } from "@/lib/local-store";
import { CLIENT_TIPS, NO_CHARGE_TIP } from "@/lib/safety";
import { TOAST_EVENT, takeAnnouncement } from "@/lib/toast";
import { track } from "@/lib/track";
import { MAX_DAYS_AHEAD } from "@/lib/validate";
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
    <fieldset className="flex min-w-0 flex-col gap-2.5">
      <legend className="label mb-2.5">{label}</legend>
      {children}
      {hint && <p className="text-sm text-muted">{hint}</p>}
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
  placeholder = "Escriba o elija",
  name,
  exclude,
  anyDestination = false,
  label,
  variant = "input",
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  name: string;
  /** Municipio que no sale en la lista porque ya está elegido en el otro campo. */
  exclude?: string;
  /** Destino del transportista: "Cualquier destino" va primero en la lista. */
  anyDestination?: boolean;
  /** El nombre del campo para el lector de pantalla, cuando el rótulo no es un <label>. */
  label?: string;
  /**
   * "guide": dentro de una guía (Desde / Hasta), con el municipio en letra
   * grande y sin borde. La lista se abre a lo ancho de la guía, que debe ser
   * `relative`.
   */
  variant?: "input" | "guide";
}) {
  const guide = variant === "guide";
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
    <div ref={wrapperRef} className={guide ? "w-full min-w-0" : "relative w-full min-w-0"}>
      <div className="relative">
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
        aria-label={label}
        className={
          guide
            ? "w-full truncate bg-transparent pr-9 font-display text-[26px] font-extrabold uppercase leading-none text-ink outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:text-muted"
            : "input pr-12"
        }
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
      <div className={`absolute inset-y-0 flex items-center ${guide ? "-right-2" : "right-1"}`}>
        <button
          type="button"
          aria-label={browsing ? "Cerrar la lista de municipios" : "Ver la lista de municipios"}
          aria-expanded={browsing}
          aria-controls={listId}
          // No le quita el foco al campo: si el teclado estaba abierto, sigue abierto.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (browsing ? close() : openList())}
          className="grid size-10 place-items-center rounded-md text-muted"
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
      </div>
      {open && options.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`absolute z-20 mt-1 max-h-80 overflow-auto rounded-md border border-line bg-surface text-ink shadow-lg ${
            guide ? "inset-x-0 top-full" : "w-full"
          }`}
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
          className={`absolute z-20 mt-1 rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-muted shadow-lg ${
            guide ? "inset-x-0 top-full" : "w-full"
          }`}
        >
          {/* Si lo único que coincide es el que está fuera de la lista, no es que no exista. */}
          {found.length > 0 ? "Ese municipio ya lo eligió. Elija otro." : "No encontramos ese municipio. Revise cómo lo escribió."}
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

/**
 * "¿Qué necesita?" del cliente: los cinco servicios en fichas con su ícono. Se
 * elige uno.
 */
export function ServicePicker({ value, onChange }: { value: Service | ""; onChange: (s: Service) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(SERVICES) as Service[]).map((key) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-2 rounded-lg border px-1.5 pb-3.5 pt-3 active:translate-y-px ${
              selected ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
            }`}
          >
            <span className="grid size-14 place-items-center rounded-[10px] bg-white">
              <ServiceIcon service={key} size={46} />
            </span>
            <span className="font-display text-lg font-extrabold uppercase leading-none">{SERVICES[key].label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "¿Qué tan grande?", solo para la mudanza: las mismas tarjetas del espacio del que viaja. */
export function SizePicker({ value, onChange }: { value: ClientSize | ""; onChange: (s: ClientSize) => void }) {
  return <SpaceCards options={CLIENT_SIZES} value={value} onChange={onChange} />;
}

/** "¿Qué servicios hace?": puede marcar varios. */
export function ServiceChecklist({
  value,
  onChange,
}: {
  value: readonly Service[];
  onChange: (services: Service[]) => void;
}) {
  const all = Object.keys(SERVICES) as Service[];
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-line bg-surface">
      {all.map((key, i) => {
        const checked = value.includes(key);
        return (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-3 py-2 pl-2 pr-3.5 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-brand ${
              checked ? "bg-paper" : ""
            } ${i > 0 ? "border-t border-[#dfe3e8]" : ""}`}
          >
            <ServiceIcon service={key} size={40} />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className={`text-base ${checked ? "font-bold" : ""}`}>{SERVICES[key].plural}</span>
              <span className="text-[13px] leading-snug text-muted">{SERVICES[key].hint}</span>
            </span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              onChange={() => onChange(all.filter((s) => (s === key ? !checked : value.includes(s))))}
            />
            <span
              aria-hidden
              className={`grid size-6 shrink-0 place-items-center rounded-sm border-2 text-sm text-white ${
                checked ? "border-ink bg-ink" : "border-[#a3abb5] bg-white"
              }`}
            >
              {checked && "✓"}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * "¿Cuánto espacio tiene?" del que viaja: solo si hace mudanzas, con las dos
 * tarjetas de la mudanza.
 */
export function SpacePicker({ value, onChange }: { value: string; onChange: (s: MovingSpace) => void }) {
  return <SpaceCards options={MOVING_SPACES} value={value} onChange={onChange} />;
}

/**
 * "¿Cuánto espacio tiene ahora?" del que ya va de viaje: las cuatro tarjetas,
 * para que baje cuando carga y suba cuando descarga en el camino (Yohany, 21 y
 * 28 de octubre de 2026). Con las dos de la mudanza no podía decir que ya iba
 * lleno.
 */
export function SpaceLeftPicker({ value, onChange }: { value: string; onChange: (s: DriverSpace) => void }) {
  return <SpaceCards options={DRIVER_SPACES} value={value} onChange={onChange} />;
}

/** Tarjetas con ícono, nombre y ejemplos. Lo elegido va en Señal. */
function SpaceCards<K extends DriverSpace>({
  options,
  value,
  onChange,
}: {
  options: Record<K, { label: string; hint: string }>;
  value: string;
  onChange: (key: K) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(options) as K[]).map((key) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`flex flex-col gap-2 rounded-md border p-3 text-left active:translate-y-px ${
              selected ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
            }`}
          >
            <span className={`grid size-[52px] place-items-center rounded-lg ${selected ? "bg-white" : "bg-bg"}`}>
              <SpaceIcon space={key} size={44} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{options[key].label}</span>
              <span className="text-[13px] leading-snug opacity-85">{options[key].hint}</span>
            </span>
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
 * El día, en un segmento: "Hoy", "Mañana" u "Otra fecha", que abre el
 * calendario. No hay jornadas. El cliente tiene además "Cualquier día"
 * (`anyDay`), primero.
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
  const dateRef = useRef<HTMLInputElement>(null);
  const other = Boolean(value) && value !== ANY_DAY && value !== today && value !== tomorrow;
  const segments = [
    ...(anyDay ? [{ label: ANY_DAY_LABEL, value: ANY_DAY }] : []),
    { label: "Hoy", value: today },
    { label: "Mañana", value: tomorrow },
  ];

  function pickOther() {
    const input = dateRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  return (
    <div
      className={`relative grid overflow-hidden rounded-md border border-line bg-surface ${
        anyDay ? "grid-cols-4" : "grid-cols-3"
      }`}
    >
      {segments.map((s, i) => (
        <Segment key={s.label} selected={value === s.value} divider={i > 0} onClick={() => onChange(s.value)}>
          {s.label}
        </Segment>
      ))}
      <Segment selected={other} divider onClick={pickOther}>
        {other ? shortDay(value) : "Otra fecha"}
      </Segment>
      {/* El calendario del teléfono: se abre con "Otra fecha". */}
      <input
        ref={dateRef}
        type="date"
        tabIndex={-1}
        aria-label="Otra fecha"
        className="pointer-events-none absolute bottom-0 right-0 h-px w-1/4 opacity-0"
        min={today}
        // Más lejos el servidor no la acepta: el calendario no la deja elegir.
        max={today ? addDays(today, MAX_DAYS_AHEAD) : undefined}
        value={other ? value : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  );
}

function Segment({
  selected,
  divider,
  onClick,
  children,
}: {
  selected: boolean;
  divider: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-1 py-3 text-center text-sm leading-tight ${
        selected ? "bg-ink font-bold text-white" : divider ? "border-l border-line-soft" : ""
      }`}
    >
      {children}
    </button>
  );
}

/** "2026-11-01" → "sáb 1 nov", para que se vea qué fecha eligió en el calendario. */
function shortDay(date: string): string {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(/[.,]/g, "");
}

/**
 * El permiso para guardar los datos (Ley 1581 de 2012), justo antes del botón
 * que los envía, con los enlaces a /terminos y /privacidad.
 */
export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-normal text-muted">
      {children}{" "}
      Al continuar acepta los{" "}
      <Link href="/terminos" className="text-brand underline">
        términos y condiciones
      </Link>
      .{" "}
      <Link href="/privacidad" className="text-brand underline">
        Cómo cuidamos sus datos
      </Link>
    </p>
  );
}

/** Un aviso que no es un error, como que el viaje de antes ya pasó. */
export function InfoNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-notice px-3.5 py-3 text-[15px]">{message}</p>;
}

/** Un error corto, en rojo y sin recuadro: debajo de la ruta o del botón. */
export function FieldError({ message, center = false }: { message: string | null; center?: boolean }) {
  if (!message) return null;
  return (
    <p role="alert" className={`text-sm text-danger ${center ? "text-center" : ""}`}>
      {message}
    </p>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-3 text-[15px] text-danger">
      {message}
    </p>
  );
}

/**
 * Una hoja que sube desde abajo, sobre la pantalla oscurecida: los consejos
 * antes de contactar y las preguntas de "¿Seguro?". Tocar fuera o el botón de
 * atrás la cierra sin seguir.
 */
function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mb-0 mt-auto w-full max-w-md rounded-t-[20px] bg-surface p-0 text-ink backdrop:bg-ink/55"
    >
      <div className="flex flex-col gap-4 px-[22px] pb-[26px] pt-3">
        <span aria-hidden className="h-1 w-10 self-center rounded-sm bg-line-soft" />
        {children}
      </div>
    </dialog>
  );
}

/**
 * "¿Seguro?" antes de algo que no se deshace, como cerrar la solicitud. El sí
 * va en rojo y el no, debajo, deja todo como estaba.
 */
export function ConfirmSheet({
  open,
  title,
  body,
  yes,
  no,
  busy = false,
  onYes,
  onNo,
}: {
  open: boolean;
  title: string;
  body: string;
  yes: string;
  no: string;
  busy?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Sheet open={open} onClose={onNo}>
      <h2 className="font-display text-[32px] font-black uppercase leading-none">{title}</h2>
      <p className="text-base leading-normal text-muted">{body}</p>
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onYes}
          disabled={busy}
          className="rounded-lg bg-[oklch(0.48_0.16_28)] p-[17px] font-display text-[22px] font-black uppercase leading-none text-white active:translate-y-px disabled:opacity-50"
        >
          {yes}
        </button>
        <button type="button" onClick={onNo} className="btn-secondary">
          {no}
        </button>
      </div>
    </Sheet>
  );
}

// Los consejos salen antes del primer contacto de cada visita (Yohany, 27 de
// octubre de 2026, con el prototipo): repetirlos en cada tarjeta cansa.
const TIPS_SEEN = "muvia.consejos-vistos";

function tipsSeen(): boolean {
  try {
    return window.sessionStorage.getItem(TIPS_SEEN) === "1";
  } catch {
    return false;
  }
}

function markTipsSeen(): void {
  try {
    window.sessionStorage.setItem(TIPS_SEEN, "1");
  } catch {
    // Sin almacenamiento, los vuelve a ver la próxima vez.
  }
}

/**
 * Las dos formas de contactar a alguien: escribirle por WhatsApp, con el
 * mensaje listo, o llamarlo. Antes del primer contacto salen los consejos para
 * cuidarse, con "Entendido, escribir" (o "llamar") y "Cancelar".
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
  const [shown, setShown] = useState<"whatsapp" | "llamada">("whatsapp");
  const href = (k: "whatsapp" | "llamada") => (k === "whatsapp" ? waLink(phone, message) : telLink(phone));
  const linkProps = (k: "whatsapp" | "llamada") =>
    k === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {};

  function contact(k: "whatsapp" | "llamada", e: React.MouseEvent) {
    if (tipsSeen()) {
      // Ya los vio: el enlace sigue solo.
      track({ kind: k, availabilityId });
      return;
    }
    e.preventDefault();
    setShown(k);
    setKind(k);
  }

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <a
          href={href("whatsapp")}
          {...linkProps("whatsapp")}
          onClick={(e) => contact("whatsapp", e)}
          className="rounded-md bg-brand p-[13px] text-center text-base font-bold text-white active:translate-y-px"
        >
          Escribir por WhatsApp
        </a>
        <a
          href={href("llamada")}
          onClick={(e) => contact("llamada", e)}
          className="rounded-md border border-line bg-surface px-4 py-[12px] text-center text-base font-bold text-ink active:translate-y-px"
        >
          Llamar
        </a>
      </div>
      <Sheet open={kind !== null} onClose={() => setKind(null)}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[32px] font-black uppercase leading-none">
            Antes de {shown === "llamada" ? "llamar" : "escribir"}
          </h2>
          <Stamp>Frágil</Stamp>
        </div>
        <ul className="flex flex-col gap-3">
          {CLIENT_TIPS.map((tip) => (
            <li key={tip} className="grid grid-cols-[22px_1fr] gap-2.5 text-base leading-snug">
              <span
                aria-hidden
                className="grid size-[22px] place-items-center rounded-sm border border-line bg-paper text-[13px] font-bold text-brand"
              >
                ✓
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-md bg-notice px-3.5 py-3 text-[15px] font-semibold leading-snug">{NO_CHARGE_TIP}</p>
        <div className="flex flex-col gap-2">
          <a
            href={href(shown)}
            {...linkProps(shown)}
            onClick={() => {
              markTipsSeen();
              track({ kind: shown, availabilityId });
              setKind(null);
            }}
            className="btn-primary text-2xl"
          >
            Entendido, {shown === "llamada" ? "llamar" : "escribir"}
          </a>
          <button type="button" onClick={() => setKind(null)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </Sheet>
    </>
  );
}

/**
 * El aviso de abajo después de cerrar algo ("Listo. Cerramos su solicitud."),
 * con "OK". Se va solo a los pocos segundos.
 */
export function Toast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = useEffectEvent((text: string | null) => {
    if (text) setMessage(text);
  });
  useEffect(() => {
    // sessionStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    show(takeAnnouncement());
    const onAnnounce = () => show(takeAnnouncement());
    window.addEventListener(TOAST_EVENT, onAnnounce);
    return () => window.removeEventListener(TOAST_EVENT, onAnnounce);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-5 z-10 mx-auto flex max-w-[calc(28rem-2rem)] items-center gap-3 rounded-lg bg-ink px-4 py-3.5 text-[15px] leading-snug text-white"
    >
      <span className="flex-1">{message}</span>
      <button type="button" onClick={() => setMessage(null)} className="text-sm font-bold text-accent">
        OK
      </button>
    </div>
  );
}

/**
 * La señal: un círculo Ocre que crece y se desvanece detrás de lo que lleva
 * adentro (el símbolo mientras busca, o un punto). Quieta si el teléfono pide
 * menos movimiento.
 */
export function Signal({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <span className="relative grid shrink-0 place-items-center">
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-full bg-accent motion-safe:animate-signal motion-reduce:opacity-0"
        style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      />
      <span className="relative grid place-items-center">{children}</span>
    </span>
  );
}

/** El punto que late en "Usted está disponible" y "Seguimos buscando". */
export function SignalDot({ className = "bg-ink" }: { className?: string }) {
  return (
    <Signal size={10}>
      <span className={`block size-2.5 rounded-full ${className}`} />
    </Signal>
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


/**
 * "Para cuidarse": consejos en el aviso suave, con el sello de FRÁGIL. Rumbox
 * no maneja plata, así que lo que más ayuda es avisar antes.
 */
export function SafetyTips({ tips }: { tips: readonly string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-notice p-[18px]">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="card-title">Para cuidarse</h2>
        <Stamp>Frágil</Stamp>
      </div>
      <ul className="flex flex-col gap-2.5 text-[15px] leading-snug">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <Link href="/ayuda" className="text-[15px] font-bold text-brand underline">
        Qué hacer si lo estafan
      </Link>
    </section>
  );
}

/** El sello de manejo de una caja. Se usa con moderación. */
function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-sm border-2 border-ink px-2 py-[3px] font-display text-sm font-extrabold uppercase leading-none tracking-[0.06em]">
      {children}
    </span>
  );
}

// --------------------------------------------------------------------- Marca

/**
 * El logotipo: se lee RUMBO de corrido sobre la vía, y una caja de cartón
 * encierra BOX. Todo va en em, así que escala con el tamaño de la letra
 * (mínimo 28px). Sobre Señal o Noche, RUM va en blanco y, sobre Noche, la vía
 * va en Señal.
 */
export function Logo({ size = 32, on = "light" }: { size?: number; on?: "light" | "brand" | "ink" }) {
  return (
    <span
      role="img"
      aria-label="Rumbox"
      className="font-display font-black leading-[0.8]"
      style={{ fontSize: size }}
    >
      <span aria-hidden className="relative inline-flex items-end whitespace-nowrap pb-[0.3em] pl-[0.02em] pr-[0.12em] pt-[0.18em]">
        <span
          className={`absolute inset-x-0 bottom-0 h-[0.2em] rounded-[0.03em] ${on === "ink" ? "bg-brand" : "bg-ink"}`}
        >
          <span
            className="absolute left-[0.08em] right-[0.06em] top-1/2 -mt-[0.025em] h-[0.05em]"
            style={{
              background: "repeating-linear-gradient(90deg, var(--accent) 0 0.16em, transparent 0.16em 0.26em)",
            }}
          />
        </span>
        <span className={`relative ${on === "light" ? "text-ink" : "text-white"}`}>RUM</span>
        <span className="relative ml-[0.03em]">
          <span className="absolute -bottom-[0.1em] -left-[0.03em] -right-[0.03em] -top-[0.14em] rounded-[0.03em] border-[0.035em] border-ink bg-carton" />
          <span className="relative text-ink">BOX</span>
        </span>
      </span>
    </span>
  );
}

/** La "R" de Big Shoulders 900, en trazos para no depender de la fuente. */
const SYMBOL_R =
  "M27.24 38.5V19.3H31.87Q34.56 19.3 35.75 20.39Q36.94 21.47 37.03 23.98Q37.05 24.65 37.06 25.16Q37.06 25.66 37.06 26.16Q37.05 26.67 37.03 27.34Q36.98 28.9 36.51 29.9Q36.03 30.89 35.04 31.42L37.29 38.5H33.48L31.65 32.02H30.84V38.5ZM30.84 28.85H31.87Q32.62 28.85 33.01 28.5Q33.39 28.16 33.43 27.53Q33.46 26.94 33.48 26.3Q33.49 25.66 33.48 25.02Q33.46 24.38 33.43 23.79Q33.39 23.15 33.01 22.81Q32.62 22.47 31.87 22.47H30.84Z";

/** El símbolo: la caja con la R, apoyada sobre la vía. Sobre Noche, la vía va en Señal. */
export function Symbol({ size = 40, on = "light" }: { size?: number; on?: "light" | "ink" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <rect x="4" y="44" width="56" height="12" rx="2" fill={on === "ink" ? "var(--brand)" : "var(--ink)"} />
      <line x1="9" y1="50" x2="56" y2="50" stroke="var(--accent)" strokeWidth="3" strokeDasharray="7 4.5" />
      <rect x="18" y="14" width="28" height="30" rx="1.5" fill="var(--carton)" stroke="var(--ink)" strokeWidth="2.4" />
      <path d={SYMBOL_R} fill="var(--ink)" />
    </svg>
  );
}

/** Los íconos: línea de 2.2 en Noche, relleno de Cartón y algunos detalles en blanco. */
function Icon({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <g fill="var(--carton)" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

const SERVICE_ICONS: Record<Service, React.ReactNode> = {
  // Cajas apiladas.
  mudanza: (
    <>
      <rect x="10" y="24" width="14" height="13" rx="1" />
      <rect x="24" y="24" width="14" height="13" rx="1" />
      <rect x="17" y="11" width="14" height="13" rx="1" />
    </>
  ),
  // Carretilla con caja.
  flete: (
    <>
      <path d="M13 9 V35 H37" fill="none" />
      <circle cx="15.5" cy="38.5" r="2.5" fill="#fff" />
      <rect x="18" y="16" width="16" height="16" rx="1" />
    </>
  ),
  // Paquete con guía.
  encomienda: (
    <>
      <rect x="9" y="14" width="30" height="22" rx="1.5" />
      <line x1="9" y1="20" x2="39" y2="20" />
      <line x1="24" y1="14" x2="24" y2="20" />
      <rect x="28" y="26" width="7" height="5" fill="#fff" />
    </>
  ),
  // Bolsa de compra.
  encargo: (
    <>
      <path d="M12 18 H36 L34 38 H14 Z" />
      <path d="M19 18 V15 a5 5 0 0 1 10 0 V18" fill="none" />
    </>
  ),
  // Sobre.
  diligencia: (
    <>
      <rect x="9" y="14" width="30" height="21" rx="2" />
      <path d="M9 16 L24 27 L39 16" fill="none" />
    </>
  ),
};

export function ServiceIcon({ service, size = 48 }: { service: Service; size?: number }) {
  return <Icon size={size}>{SERVICE_ICONS[service]}</Icon>;
}

const SPACE_ICONS: Record<DriverSpace, React.ReactNode> = {
  // Sobre y cajita.
  solo_paquetes: (
    <>
      <rect x="6" y="15" width="24" height="16" rx="1.5" />
      <path d="M6 17 L18 25 L30 17" fill="none" />
      <rect x="27" y="23" width="15" height="13" rx="1" />
      <line x1="34.5" y1="23" x2="34.5" y2="27" />
    </>
  ),
  // Caja y maleta.
  carga_parcial: (
    <>
      <rect x="6" y="22" width="17" height="16" rx="1" />
      <line x1="6" y1="27" x2="23" y2="27" />
      <rect x="26" y="17" width="16" height="21" rx="2.5" />
      <path d="M30 17 V13 H38 V17" fill="none" />
      <line x1="31" y1="22" x2="31" y2="33" />
      <line x1="37" y1="22" x2="37" y2="33" />
    </>
  ),
  // Cama.
  medio_camion: (
    <>
      <rect x="5" y="14" width="6" height="24" rx="1" />
      <rect x="11" y="26" width="32" height="8" rx="1" />
      <rect x="14" y="21" width="9" height="5" rx="1.5" fill="#fff" />
      <line x1="11" y1="34" x2="11" y2="38" />
      <line x1="42" y1="34" x2="42" y2="38" />
    </>
  ),
  // Casa.
  camion_entero: (
    <>
      <path d="M6 22 L24 9 L42 22 V39 H6 Z" />
      <rect x="13" y="28" width="8" height="11" fill="#fff" />
      <rect x="27" y="25" width="9" height="7" fill="#fff" />
      <line x1="31.5" y1="25" x2="31.5" y2="32" />
    </>
  ),
};

export function SpaceIcon({ space, size = 48 }: { space: DriverSpace; size?: number }) {
  return <Icon size={size}>{SPACE_ICONS[space]}</Icon>;
}
