"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  closeRequest,
  createRequest,
  getLiveConfig,
  getMyRequest,
  type DriverMatch,
} from "@/app/actions";
import {
  CitySelect,
  Choices,
  ContactButtons,
  DayPicker,
  ErrorNote,
  Field,
  InfoNote,
  PrivacyNote,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { useActiveScreen } from "@/components/one-at-a-time";
import { getCity } from "@/lib/cities";
import { capitalize, isStillValid, whenText } from "@/lib/dates";
import {
  ANY_DAY,
  ANY_DAY_LABEL,
  ANY_DESTINATION,
  SAME_CITY_ERROR,
  VOLUMES,
  isKey,
  spaceInSentence,
  volumeInSentence,
  type Volume,
} from "@/lib/domain";
import { listenForDrivers } from "@/lib/live";
import { KEYS, forget, load, save } from "@/lib/local-store";
import { refreshWhileOpen } from "@/lib/refresh";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { requestInputError } from "@/lib/validate";

/** La solicitud que el cliente tiene abierta, guardada en su teléfono. Una a la vez. */
export type MyRequest = {
  id: string;
  editToken: string;
  origin: string;
  destination: string;
  date: string;
  volume: Volume;
};

/** Todo en una sola pantalla, con las mismas preguntas y el mismo orden que el transportista. */
export function ClientForm() {
  const { today } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  // "Cualquier día" viene elegido (Yohany, 21 de octubre de 2026).
  const [pickedDate, setDate] = useState(ANY_DAY);
  const day = useServiceDay(pickedDate);
  const date = pickedDate === ANY_DAY ? ANY_DAY : day;
  const [volume, setVolume] = useState<Volume | "">("");
  const [error, setError] = useState<string | null>(null);
  // "Tu solicitud anterior ya pasó", cuando vuelve el formulario porque se venció.
  const [notice, setNotice] = useState<string | null>(null);
  // La solicitud abierta: si hay una, se muestra esa en vez del formulario.
  const [current, setCurrent] = useState<MyRequest | null>(null);
  // Los transportistas que salieron al solicitar; null si la solicitud viene guardada de antes.
  const [matches, setMatches] = useState<DriverMatch[] | null>(null);
  // "Cambiar mi solicitud": vuelve el formulario y la de antes sigue abierta hasta mandar la nueva.
  const [editing, setEditing] = useState(false);
  // Una cosa a la vez en el teléfono: si está como transportista, se va a esa pantalla.
  const screen = useActiveScreen();
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Hace falta saber qué día es hoy para ver si la solicitud guardada ya pasó.
    if (!today) return;
    // Ya no se pide el teléfono (Yohany, 23 de octubre de 2026): se borra el que quedó guardado.
    forget(KEYS.clientPhone);
    const saved = load<MyRequest | null>(KEYS.clientRequest, null);
    if (saved) {
      // El formulario queda con sus datos, para cambiar solo lo que haga falta.
      // localStorage solo existe en el navegador: se lee después de hidratar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrigin(saved.origin);
      setDestination(saved.destination);
      setVolume(saved.volume);
      // Vale hasta que termina el día del viaje: después se olvida y vuelve el formulario.
      if (isStillValid(saved.date, today)) {
        setDate(saved.date);
        setCurrent(saved);
      } else {
        save(KEYS.clientRequest, null);
        setNotice(EXPIRED_NOTICE);
      }
    }
    setLoaded(true);
  }, [today]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = { origin, destination, date, volume };
    // Lo que falta se dice aquí, con el tono de la app y aunque no haya señal.
    const invalid = requestInputError(input, today);
    if (invalid) {
      setError(invalid);
      return;
    }
    startTransition(async () => {
      const res = await callServer(() =>
        createRequest({
          ...input,
          // Una solicitud a la vez: la nueva reemplaza la que estaba abierta.
          replaces: current ? { id: current.id, editToken: current.editToken } : undefined,
        }),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const mine: MyRequest = {
        id: res.id,
        editToken: res.editToken,
        origin,
        destination,
        date,
        volume: volume as Volume,
      };
      save(KEYS.clientRequest, mine);
      setCurrent(mine);
      setNotice(null);
      setMatches(res.matches);
      setEditing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!loaded || (!current && screen === "/transportista")) return null;

  if (current && !editing) {
    return (
      <MyRequestView
        key={current.id}
        request={current}
        matches={matches}
        onRestart={() => {
          // El formulario vuelve con los mismos datos, para cambiar solo lo que haga falta.
          setEditing(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onEnd={(reason) => {
          // Ya consiguió, o se cerró o pasó el día: se olvida y vuelve el formulario con sus datos.
          save(KEYS.clientRequest, null);
          setNotice(reason === "expired" ? EXPIRED_NOTICE : null);
          setCurrent(null);
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
      <InfoNote message={notice} />
      {/* noValidate: el navegador no muestra su propio globito; los errores salen abajo, con nuestras palabras. */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Field label="¿Desde dónde?">
          <CitySelect name="origin" value={origin} onChange={setOrigin} exclude={destination} />
        </Field>

        <Field label="¿Hacia dónde?">
          {/* El origen no sale en la lista. El aviso queda para lo guardado de antes. */}
          <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} />
          <ErrorNote message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </Field>

        <Field label="¿Qué día?">
          <DayPicker value={date} onChange={setDate} anyDay />
        </Field>

        {/* La misma lista de tamaños que elige el transportista. */}
        <Field label="¿Qué vas a mover?">
          <Choices options={VOLUMES} value={volume} onChange={setVolume} columns={1} />
        </Field>

        <PrivacyNote>Al continuar, aceptas que guardemos tu solicitud mientras esté abierta.</PrivacyNote>
        <ErrorNote message={error} />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Un momento…" : "Solicitar transportista"}
        </button>
      </form>
    </div>
  );
}

const EXPIRED_NOTICE = "Tu solicitud anterior ya pasó. Si todavía necesitas mover algo, haz una nueva.";

/**
 * La solicitud abierta, con los transportistas que le sirven. Se ve al
 * solicitar y cada vez que vuelve a la pantalla, con la lista al día.
 */
function MyRequestView({
  request,
  matches: initialMatches,
  onRestart,
  onEnd,
}: {
  request: MyRequest;
  matches: DriverMatch[] | null;
  onRestart: () => void;
  onEnd: (reason?: "expired") => void;
}) {
  const { today, tomorrow } = useBogotaDates();
  const [matches, setMatches] = useState<DriverMatch[] | null>(initialMatches);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transportistas que le sirven ahora, desde el servidor: al abrir la
  // pantalla, al volver a la app, cada minuto mientras la tiene abierta y
  // apenas un transportista se pone disponible o cambia la suya.
  const { id, editToken, date } = request;
  const fresh = initialMatches !== null;
  // Número de la última consulta: una respuesta vieja no pisa una más nueva.
  const latest = useRef(0);
  useEffect(() => {
    let cancelled = false;
    function refresh(quiet: boolean) {
      const n = ++latest.current;
      getMyRequest({ id, editToken }).then(
        (res) => {
          if (cancelled || n !== latest.current) return;
          if (!res.ok) {
            if (res.gone) onEnd();
            return;
          }
          if (res.status === "cerrada") {
            // Cerrada en el servidor: si es porque ya pasó el día, se le dice.
            onEnd(isStillValid(date, today) ? undefined : "expired");
            return;
          }
          setError((e) => (e === NO_CONNECTION ? null : e));
          setMatches(res.matches);
        },
        () => {
          // Sin señal se queda lo guardado en el teléfono, con el aviso. Si
          // falla una de las que se hacen solas, no se avisa.
          if (!cancelled && !quiet && n === latest.current) setError(NO_CONNECTION);
        },
      );
    }
    // Primero los datos de Realtime: las acciones del servidor van una detrás
    // de otra, y esta es rápida porque no toca la base de datos.
    let unlisten = () => {};
    callServer(() => getLiveConfig()).then((config) => {
      if (cancelled || !("live" in config)) return;
      // Un transportista le sirve desde su día en adelante: se escucha el canal
      // de todos los días, no solo el de la solicitud.
      if (config.live) unlisten = listenForDrivers(config.live, () => refresh(true));
    });
    if (!fresh) refresh(false);
    const stop = refreshWhileOpen(() => refresh(true));
    return () => {
      cancelled = true;
      stop();
      unlisten();
    };
    // Solo al montar o si cambia la solicitud guardada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editToken, date, fresh]);

  async function end() {
    setBusy(true);
    setError(null);
    // Lo que traiga una consulta que salió antes ya no sirve.
    latest.current++;
    const res = await callServer(() => closeRequest({ id, editToken }));
    setBusy(false);
    // Si el servidor ya no la tiene, tampoco les sale a los transportistas.
    if (!res.ok && !("gone" in res && res.gone)) {
      setError(res.error);
      return;
    }
    onEnd();
  }

  const route = `${getCity(request.origin)?.name} → ${getCity(request.destination)?.name}`;
  const anyDay = request.date === ANY_DAY;
  // Con "Cualquier día", el transportista que sale después de hoy dice desde cuándo.
  const whenOf = (date: string) => whenText(date, today, tomorrow);

  // No hay precio: lo acuerdan el cliente y el transportista cuando hablan.
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <h2 className="text-lg font-bold">Tu solicitud</h2>
        <dl className="mt-3 grid gap-1 text-sm">
          <div>
            <dt className="sr-only">Lugar</dt>
            <dd className="font-semibold">{route}</dd>
          </div>
          <div>
            <dt className="sr-only">Día</dt>
            <dd>{anyDay ? ANY_DAY_LABEL : capitalize(whenOf(request.date))}</dd>
          </div>
          {/* Lo guardado por una versión vieja puede traer un tamaño que ya no existe. */}
          {isKey(VOLUMES, request.volume) && (
            <div>
              <dt className="sr-only">Qué vas a mover</dt>
              <dd>
                Vas a mover {volumeInSentence(request.volume)}{" "}
                <span className="text-brand-ink/70">({VOLUMES[request.volume].hint.toLowerCase()})</span>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Es una pantalla de espera: mientras no haya transportistas, o hasta
          que llegue la lista, se ve que seguimos buscando. */}
      {!matches || matches.length === 0 ? (
        <Searching anyDay={anyDay} />
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
                Va de {getCity(m.origin_city)?.name} a{" "}
                {m.destination_city === ANY_DESTINATION ? "cualquier destino" : getCity(m.destination_city)?.name}
                {/* Si todavía no sale, se le dice desde cuándo. */}
                {anyDay && m.service_date > today && `, desde ${whenOf(m.service_date)}`}
              </p>
              <div className="mt-3">
                <ContactButtons
                  availabilityId={m.id}
                  phone={m.whatsapp}
                  message={`Hola, te encontré en Mudavía. Necesito un servicio ${route}${anyDay ? "" : ` para ${whenOf(request.date)}`}. ¿Me puedes ayudar?`}
                />
              </div>
            </article>
          ))}
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <Radar size="small" />
            Seguimos buscando más transportistas. Vuelve a mirar cada tanto.
          </p>
        </section>
      )}

      <Link href="/ayuda" className="text-center text-sm font-semibold underline">
        Qué hacer si te estafan
      </Link>

      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
        {confirmEnd ? (
          <div className="card flex flex-col gap-3">
            <p className="text-sm">¿Dejamos de mostrar tu solicitud a los transportistas?</p>
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
            Ya no necesito este servicio
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={onRestart}>
          Cambiar mi solicitud
        </button>
      </div>
    </div>
  );
}

/** Mientras no hay transportistas: la solicitud quedó guardada y seguimos buscando. */
function Searching({ anyDay }: { anyDay: boolean }) {
  return (
    <section className="card flex flex-col items-center gap-3 py-5 text-center">
      <div role="status" className="flex flex-col items-center gap-2">
        <Radar size="large" />
        <h2 className="text-lg font-semibold">Buscando transportistas…</h2>
        <p className="text-sm text-muted">
          Tu solicitud quedó guardada. Cuando un transportista vaya para allá{anyDay ? "" : " ese día"}, te
          sale aquí para que lo llames o le escribas por WhatsApp.
        </p>
        <p className="text-sm font-semibold">Entra a Mudavía cada tanto para mirar.</p>
      </div>
    </section>
  );
}

/** Ondas que salen del centro: la app sigue buscando. */
function Radar({ size }: { size: "large" | "small" }) {
  const box = size === "large" ? "size-20" : "size-4";
  const dot = size === "large" ? "size-5" : "size-2";
  return (
    <span aria-hidden className={`relative grid shrink-0 place-items-center ${box}`}>
      {/* Tres ondas desfasadas. El retraso va en style: la clase animate-radar
          trae la animación completa y pisaría un retraso puesto con clase. */}
      {["0s", "-0.8s", "-1.6s"].map((delay) => (
        <span
          key={delay}
          className="absolute inset-0 rounded-full bg-brand/40 motion-safe:animate-radar"
          style={{ animationDelay: delay }}
        />
      ))}
      <span className={`relative rounded-full bg-brand ${dot}`} />
    </span>
  );
}
