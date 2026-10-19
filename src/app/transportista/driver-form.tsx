"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getMyAvailability, publishAvailability, updateAvailability, type PendingRequest } from "@/app/actions";
import {
  CitySelect,
  Choices,
  DayPicker,
  ErrorNote,
  Field,
  OriginCitySelect,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { getCity } from "@/lib/cities";
import { capitalize, isStillValid, whenText } from "@/lib/dates";
import {
  ANY_DESTINATION,
  ANY_DESTINATION_LABEL,
  CLIENT_LABOR_FOR_DRIVER,
  DRIVER_LABOR,
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  SPACE_CAPACITY,
  destinationName,
  isKey,
  spaceFitsVolume,
  spaceInSentence,
  VOLUMES,
  type DriverLabor,
  type DriverSpace,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { refreshWhileOpen } from "@/lib/refresh";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { formatWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";

type Profile = { labor: DriverLabor | ""; whatsapp: string };

export type MyPost = {
  id: string;
  editToken: string;
  origin: string;
  // Un municipio o "cualquiera" (Cualquier destino). null en los guardados
  // cuando el destino era opcional.
  destination: string | null;
  date: string; // el día del viaje
  space: DriverSpace;
};

export function DriverForm() {
  const { today } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = useServiceDay(pickedDate);
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

        {/* El match va por el corredor del viaje (Modo Ruta) o, con "Cualquier
            destino", por el municipio de donde sale. Es lógica interna: el
            transportista no la ve. */}
        <Field label="¿Hacia dónde vas?">
          {destination !== ANY_DESTINATION && (
            <>
              {/* El origen no sale en la lista. Aun así "Ubicarme" puede dejar los dos iguales: ahí sale el aviso. */}
              <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} />
              <ErrorNote message={origin && origin === destination ? SAME_CITY_ERROR : null} />
            </>
          )}
          {/* Tocarlo otra vez vuelve a mostrar la lista de municipios. */}
          <Choices
            options={{ [ANY_DESTINATION]: { label: ANY_DESTINATION_LABEL, hint: "Vas a donde te pidan" } }}
            value={destination === ANY_DESTINATION ? ANY_DESTINATION : ""}
            onChange={() => setDestination(destination === ANY_DESTINATION ? "" : ANY_DESTINATION)}
            columns={1}
          />
        </Field>

        {/* Es un viaje: vale ese día y 24 horas más. */}
        <Field label="¿Qué día viajas?">
          <DayPicker value={date} onChange={setDate} />
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

function PendingList({ items }: { items: PendingRequest[] }) {
  const { today, tomorrow } = useBogotaDates();
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Por ahora nadie está buscando transportista. Cuando alguien busque, le mostramos tu número y también te
        sale aquí.
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold">Clientes buscando transportista</h3>
        {/* Por la privacidad del cliente, el transportista no ve su número. */}
        <p className="text-sm text-muted">Ellos ven tu número y te llaman o te escriben por WhatsApp.</p>
      </div>
      {items.map((r) => (
        <article key={r.id} className="card">
          <p className="font-semibold">
            {getCity(r.origin_city)?.name} → {getCity(r.destination_city)?.name}
          </p>
          <p className="text-sm text-muted">
            {capitalize(whenText(r.service_date, today, tomorrow))}
            {" · "}
            {VOLUMES[r.volume].label}
            {/* Con paquetes o sobres no se pregunta la ayuda para cargar. */}
            {r.volume !== "sobres" && ` · ${CLIENT_LABOR_FOR_DRIVER[r.labor]}`}
          </p>
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

  // Un viaje vale su día y 24 horas más. Si ya pasó, se apagó solo y vuelve el formulario
  // con sus datos; no hace falta preguntarle al servidor. Lo mismo con lo
  // guardado de antes sin destino o con el espacio de un carro particular
  // (baúl o asientos): ahora tiene que elegir otra vez.
  const ended = !post.destination || !isStillValid(post.date, today) || !isKey(DRIVER_SPACES, post.space);

  // Espacio al día y clientes que esperan, desde el servidor: al abrir la
  // pantalla, al volver a la app y cada minuto mientras la tiene abierta. Así
  // ve a los clientes que solicitan después de que él se puso disponible.
  const { id, editToken } = post;
  const fresh = initialPending !== null;
  // Número de la última consulta: una respuesta vieja no pisa una más nueva ni
  // lo que acaba de cambiar con los botones.
  const latest = useRef(0);
  useEffect(() => {
    if (ended) {
      onEnd();
      return;
    }
    let cancelled = false;
    function refresh(quiet: boolean) {
      const n = ++latest.current;
      getMyAvailability({ id, editToken }).then(
        (res) => {
          if (cancelled || n !== latest.current) return;
          if (!res.ok) {
            if (res.gone) onEnd();
            return;
          }
          if (res.status === "llena") {
            onEnd();
            return;
          }
          setError((e) => (e === NO_CONNECTION ? null : e));
          setPending(res.pending);
          onChange({ ...post, space: res.space });
        },
        () => {
          // Sin señal se queda lo guardado en el teléfono, con el aviso. Si
          // falla una de las que se hacen solas, no se avisa.
          if (!cancelled && !quiet && n === latest.current) setError(NO_CONNECTION);
        },
      );
    }
    if (!fresh) refresh(false);
    const stop = refreshWhileOpen(() => refresh(true));
    return () => {
      cancelled = true;
      stop();
    };
    // Solo al montar, si cambia el trabajo guardado o si ya se apagó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editToken, fresh, ended]);

  async function patch(change: { status?: "llena"; space?: DriverSpace }) {
    setBusy(true);
    setError(null);
    // Lo que traiga una consulta que salió antes o durante el cambio ya no sirve.
    latest.current++;
    const res = await callServer(() => updateAvailability({ id, editToken, ...change }));
    latest.current++;
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
          {getCity(post.origin)?.name} → {destinationName(post.destination)}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Día del viaje</dt>
        <dd>
          Viajas {whenText(post.date, today, tomorrow)}
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
