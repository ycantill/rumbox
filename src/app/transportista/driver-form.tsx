"use client";

import { useEffect, useState, useTransition } from "react";
import { getMyAvailability, publishAvailability, updateAvailability, type PendingRequest } from "@/app/actions";
import {
  CitySelect,
  Choices,
  ContactButtons,
  ErrorNote,
  Field,
  OriginCitySelect,
  useBogotaDates,
  useBogotaHour,
} from "@/components/ui";
import { getCity } from "@/lib/cities";
import { capitalize, whenText } from "@/lib/dates";
import {
  CLIENT_LABOR_FOR_DRIVER,
  DRIVER_LABOR,
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  SPACE_CAPACITY,
  isKey,
  slotsLeftToday,
  spaceFitsVolume,
  spaceInSentence,
  TIME_SLOTS,
  VOLUMES,
  type DriverLabor,
  type DriverSpace,
  type TimeSlot,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { formatWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";

type Profile = { labor: DriverLabor | ""; whatsapp: string };

export type MyPost = {
  id: string;
  editToken: string;
  origin: string;
  destination: string | null; // null en los guardados cuando el destino era opcional
  date: string; // el día del viaje
  timeSlot?: TimeSlot; // los guardados antes no lo traen
  space: DriverSpace;
};

export function DriverForm() {
  const { today, tomorrow } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const hour = useBogotaHour();
  // Para hoy solo quedan las jornadas que no han pasado; ya de noche, hoy desaparece.
  const todayLeft = hour === null ? ALL_SLOTS : slotsLeftToday(hour);
  const todayOpen = todayLeft.length > 0;
  const date = pickedDate && (pickedDate !== today || todayOpen) ? pickedDate : todayOpen ? today : tomorrow;
  const slots = date === today ? todayLeft : ALL_SLOTS;
  const [pickedSlot, setTimeSlot] = useState<TimeSlot | "">("todo_el_dia");
  const timeSlot = pickedSlot && slots.includes(pickedSlot) ? pickedSlot : "";
  const [space, setSpace] = useState<DriverSpace | "">("");
  const [labor, setLabor] = useState<DriverLabor | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRequest[] | null>(null);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Un trabajo a la vez: si ya hay uno, se muestra ese en vez del formulario.
  const current = posts[0];

  // Precarga desde el teléfono: mano de obra y número. Lo guardado antes puede
  // traer también el vehículo, que ya no se pregunta.
  useEffect(() => {
    const p = load<Profile>(KEYS.driverProfile, { labor: "", whatsapp: "" });
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabor(p.labor);
    setWhatsapp(p.whatsapp);
    setPosts(load<MyPost[]>(KEYS.driverPosts, []));
    setLoaded(Boolean(today));
  }, [today]);

  function updateCurrent(p: MyPost) {
    setPosts([p]);
    save(KEYS.driverPosts, [p]);
  }

  function endCurrent() {
    // El formulario vuelve con los datos de antes, para ponerse otra vez con un toque.
    if (current) {
      setOrigin(current.origin);
      setDestination(current.destination ?? "");
      if (current.timeSlot) setTimeSlot(current.timeSlot);
      // El baúl o los asientos de un carro particular ya no son una opción.
      if (isKey(DRIVER_SPACES, current.space)) setSpace(current.space);
    }
    setPosts([]);
    setPending(null);
    save(KEYS.driverPosts, []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await callServer(() =>
        publishAvailability({
          origin,
          destination,
          date,
          timeSlot,
          space,
          labor,
          whatsapp,
        }),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      save(KEYS.driverProfile, { labor, whatsapp } satisfies Profile);
      const post: MyPost = {
        id: res.id,
        editToken: res.editToken,
        origin,
        destination,
        date,
        timeSlot: timeSlot as TimeSlot,
        space: space as DriverSpace,
      };
      updateCurrent(post);
      setPending(res.pending);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!loaded) return null;

  if (current) {
    return (
      <CurrentWork
        key={current.id}
        post={current}
        phone={normalizeWhatsApp(whatsapp)}
        justPublished={pending !== null}
        pending={pending}
        onChange={updateCurrent}
        onEnd={endCurrent}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="-mt-4 text-sm text-muted">
        Cuéntanos hacia dónde vas y qué día viajas. No tienes que crear cuenta ni pagar comisiones.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="¿Dónde estás?">
          <OriginCitySelect name="origin" value={origin} onChange={setOrigin} exclude={destination} />
        </Field>

        {/* El match va por el corredor del viaje (Modo Ruta). Es lógica
            interna: el transportista no la ve. */}
        <Field label="¿Hacia dónde vas?">
          {/* El origen no sale en la lista. Aun así "Ubicarme" puede dejar los dos iguales: ahí sale el aviso. */}
          <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} />
          <ErrorNote message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </Field>

        {/* Es un viaje: vale solo ese día. */}
        <Field label="¿Qué día viajas?">
          <div className="grid grid-cols-3 gap-2">
            {todayOpen && <QuickDate label="Hoy" value={today} current={date} onPick={setDate} />}
            <QuickDate label="Mañana" value={tomorrow} current={date} onPick={setDate} />
            <input
              type="date"
              className="input"
              min={todayOpen ? today : tomorrow}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Otra fecha"
            />
          </div>
          <Choices options={slotOptions(slots)} value={timeSlot} onChange={setTimeSlot} />
        </Field>

        {/* La misma lista de tamaños que elige el cliente. */}
        <Field label="¿Cuánto puedes llevar?">
          <Choices options={DRIVER_SPACES} value={space} onChange={setSpace} columns={1} />
        </Field>

        <Field label="¿Ayudas a cargar?">
          <Choices options={DRIVER_LABOR} value={labor} onChange={setLabor} columns={1} />
        </Field>

        <Field label="Tu teléfono" hint="Los clientes te pueden llamar o escribir por WhatsApp a este número.">
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
          {isPending ? "Un momento…" : "Ponerme disponible"}
        </button>
      </form>
    </div>
  );
}

const ALL_SLOTS = Object.keys(TIME_SLOTS) as TimeSlot[];

function slotOptions(slots: TimeSlot[]) {
  return Object.fromEntries(slots.map((s) => [s, TIME_SLOTS[s]])) as Record<TimeSlot, string>;
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

function PendingList({ items }: { items: PendingRequest[] }) {
  const { today, tomorrow } = useBogotaDates();
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Por ahora nadie está buscando transportista. Cuando alguien busque, le mostramos tu número.
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Clientes buscando transportista</h3>
      {items.map((r) => (
        <article key={r.id} className="card">
          <p className="font-semibold">
            {getCity(r.origin_city)?.name} → {getCity(r.destination_city)?.name}
          </p>
          <p className="text-sm text-muted">
            {capitalize(whenText(r.service_date, today, tomorrow))} · {VOLUMES[r.volume].label}
            {/* Con paquetes o sobres no se pregunta la ayuda para cargar. */}
            {r.volume !== "sobres" && ` · ${CLIENT_LABOR_FOR_DRIVER[r.labor]}`}
          </p>
          <div className="mt-3">
            <ContactButtons
              phone={r.whatsapp}
              message={`Hola, vi tu solicitud en Muvia de ${getCity(r.origin_city)?.name} a ${getCity(r.destination_city)?.name} para ${whenText(r.service_date, today, tomorrow)}. Puedo hacerte el viaje.`}
            />
          </div>
        </article>
      ))}
    </section>
  );
}

function CurrentWork({
  post,
  phone,
  justPublished,
  pending: initialPending,
  onChange,
  onEnd,
}: {
  post: MyPost;
  /** El teléfono con que se puso disponible, para que vea si quedó bien. */
  phone: string | null;
  justPublished: boolean;
  pending: PendingRequest[] | null;
  onChange: (p: MyPost) => void;
  onEnd: () => void;
}) {
  const { today, tomorrow } = useBogotaDates();
  const [pending, setPending] = useState<PendingRequest[] | null>(initialPending);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un viaje vale solo su día. Si ya pasó, se apagó solo y vuelve el formulario
  // con sus datos; no hace falta preguntarle al servidor. Lo mismo con lo
  // guardado de antes sin destino o con el espacio de un carro particular
  // (baúl o asientos): ahora tiene que elegir otra vez.
  const ended = !post.destination || post.date < today || !isKey(DRIVER_SPACES, post.space);

  // Al volver a la pantalla: espacio al día y clientes que esperan, desde el servidor.
  const { id, editToken } = post;
  const fresh = initialPending !== null;
  useEffect(() => {
    if (ended) {
      onEnd();
      return;
    }
    if (fresh) return;
    let cancelled = false;
    getMyAvailability({ id, editToken }).then(
      (res) => {
        if (cancelled) return;
        if (!res.ok) {
          if (res.gone) onEnd();
          return;
        }
        if (res.status === "llena") {
          onEnd();
          return;
        }
        setPending(res.pending);
        onChange({ ...post, space: res.space });
      },
      () => {
        // Sin señal se queda lo guardado en el teléfono, con el aviso.
        if (!cancelled) setError(NO_CONNECTION);
      },
    );
    return () => {
      cancelled = true;
    };
    // Solo al montar, si cambia el trabajo guardado o si ya se apagó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editToken, fresh, ended]);

  async function patch(change: { status?: "llena"; space?: DriverSpace }) {
    setBusy(true);
    setError(null);
    const res = await callServer(() => updateAvailability({ id, editToken, ...change }));
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    return true;
  }

  async function onlyPackages() {
    if (!(await patch({ space: "solo_paquetes" }))) return;
    onChange({ ...post, space: "solo_paquetes" });
    // Los clientes que ya no caben dejan de salir en la lista.
    setPending((list) => list && list.filter((r) => spaceFitsVolume("solo_paquetes", r.volume)));
  }

  async function end() {
    // Se apaga en el servidor para que ningún cliente lo vea, y se olvida en el teléfono.
    if (await patch({ status: "llena" })) onEnd();
  }

  const details = (
    <dl className="mt-3 grid gap-1 text-sm">
      <div>
        <dt className="sr-only">Lugar</dt>
        <dd className="font-semibold">
          {getCity(post.origin)?.name} → {getCity(post.destination)?.name}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Día del viaje</dt>
        <dd>
          Viajas {whenText(post.date, today, tomorrow)}
          {post.timeSlot && ` · ${TIME_SLOTS[post.timeSlot]}`}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Cuánto puedes llevar</dt>
        <dd>Puedes llevar {spaceInSentence(post.space)}</dd>
      </div>
    </dl>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <h2 className="text-lg font-bold">
          {justPublished ? "¡Listo! Ya estás disponible para este servicio." : "Estás disponible para este servicio"}
        </h2>
        {details}
        <p className="mt-4 text-sm text-brand-ink/80">
          Los clientes que necesiten un servicio te llamarán o te escribirán por WhatsApp
          {phone ? ` al ${formatWhatsApp(phone)}` : ""}.
        </p>
      </section>

      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
        {SPACE_CAPACITY[post.space] > 1 && (
          <button type="button" className="btn-secondary" disabled={busy} onClick={onlyPackages}>
            Solo queda espacio para paquetes
          </button>
        )}
        {confirmEnd ? (
          <div className="card flex flex-col gap-3">
            <p className="text-sm">¿Dejamos de mostrarte a los clientes?</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmEnd(false)}>
                No
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={end}>
                Sí
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => setConfirmEnd(true)}>
            Ya no voy a trabajar
          </button>
        )}
      </div>

      {pending && <PendingList items={pending} />}
    </div>
  );
}
