"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  closeRequest,
  createRequest,
  getAlertsConfig,
  getMyRequest,
  subscribeToAlerts,
  type DriverMatch,
} from "@/app/actions";
import {
  CitySelect,
  Choices,
  ContactButtons,
  DayPicker,
  ErrorNote,
  Field,
  OriginCitySelect,
  PrivacyNote,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { getCity } from "@/lib/cities";
import { capitalize, isStillValid, whenText } from "@/lib/dates";
import {
  CLIENT_LABOR,
  DRIVER_LABOR,
  ANY_DESTINATION,
  SAME_CITY_ERROR,
  VOLUMES,
  spaceInSentence,
  type ClientLabor,
  type Volume,
} from "@/lib/domain";
import { listenForDrivers } from "@/lib/live";
import { KEYS, load, save } from "@/lib/local-store";
import { alertState, getAlertSubscription, type AlertState } from "@/lib/push-client";
import { refreshWhileOpen } from "@/lib/refresh";
import { NO_CONNECTION, callServer } from "@/lib/server-call";

/** La solicitud que el cliente tiene abierta, guardada en su teléfono. Una a la vez. */
export type MyRequest = {
  id: string;
  editToken: string;
  origin: string;
  destination: string;
  date: string;
  volume: Volume;
  labor: ClientLabor;
};

/** Todo en una sola pantalla, con las mismas preguntas y el mismo orden que el transportista. */
export function ClientForm() {
  const { today } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = useServiceDay(pickedDate);
  const [volume, setVolume] = useState<Volume | "">("");
  const [labor, setLabor] = useState<ClientLabor | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  // La solicitud abierta: si hay una, se muestra esa en vez del formulario.
  const [current, setCurrent] = useState<MyRequest | null>(null);
  // Los transportistas que salieron al solicitar; null si la solicitud viene guardada de antes.
  const [matches, setMatches] = useState<DriverMatch[] | null>(null);
  // "Hacer otra solicitud": vuelve el formulario y la de antes sigue abierta hasta mandar la nueva.
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Para paquetes o sobres no hay nada que preguntar de ayuda para cargar.
  const asksLabor = volume !== "sobres";

  useEffect(() => {
    // Hace falta saber qué día es hoy para ver si la solicitud guardada ya pasó.
    if (!today) return;
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(load(KEYS.clientPhone, ""));
    const saved = load<MyRequest | null>(KEYS.clientRequest, null);
    if (saved) {
      // El formulario queda con sus datos, para cambiar solo lo que haga falta.
      setOrigin(saved.origin);
      setDestination(saved.destination);
      setVolume(saved.volume);
      if (saved.volume !== "sobres") setLabor(saved.labor);
      // Vale el día del viaje y 24 horas más: después se olvida y vuelve el formulario.
      if (isStillValid(saved.date, today)) {
        setDate(saved.date);
        setCurrent(saved);
      } else {
        save(KEYS.clientRequest, null);
      }
    }
    setLoaded(true);
  }, [today]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const sentLabor = asksLabor ? labor : "yo_cargo";
      const res = await callServer(() =>
        createRequest({
          origin,
          destination,
          date,
          volume,
          labor: sentLabor,
          whatsapp,
          // Una solicitud a la vez: la nueva reemplaza la que estaba abierta.
          replaces: current ? { id: current.id, editToken: current.editToken } : undefined,
        }),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      save(KEYS.clientPhone, whatsapp);
      const mine: MyRequest = {
        id: res.id,
        editToken: res.editToken,
        origin,
        destination,
        date,
        volume: volume as Volume,
        labor: sentLabor as ClientLabor,
      };
      save(KEYS.clientRequest, mine);
      setCurrent(mine);
      setMatches(res.matches);
      setEditing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!loaded) return null;

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
        onEnd={() => {
          // Ya consiguió, o se cerró o pasó el día: se olvida y vuelve el formulario con sus datos.
          save(KEYS.clientRequest, null);
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
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="¿Desde dónde?">
          <OriginCitySelect name="origin" value={origin} onChange={setOrigin} exclude={destination} />
        </Field>

        <Field label="¿Hacia dónde?">
          {/* El origen no sale en la lista. Aun así "Ubicarme" puede dejar los dos iguales: ahí sale el aviso. */}
          <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} />
          <ErrorNote message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </Field>

        <Field label="¿Qué día?">
          <DayPicker value={date} onChange={setDate} />
        </Field>

        {/* La misma lista de tamaños que elige el transportista. */}
        <Field label="¿Qué vas a mover?">
          <Choices options={VOLUMES} value={volume} onChange={setVolume} columns={1} />
        </Field>

        {asksLabor && (
          <Field label="¿Necesitas ayuda para cargar?">
            <Choices options={CLIENT_LABOR} value={labor} onChange={setLabor} columns={1} />
          </Field>
        )}

        <Field label="Tu teléfono" hint="Solo lo guardamos nosotros: los transportistas no lo ven.">
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

        <PrivacyNote>Al continuar, aceptas que guardemos tu teléfono mientras tu solicitud esté abierta.</PrivacyNote>
        <ErrorNote message={error} />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Un momento…" : "Solicitar transportista"}
        </button>
      </form>
    </div>
  );
}

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
  onEnd: () => void;
}) {
  const { today, tomorrow } = useBogotaDates();
  const [matches, setMatches] = useState<DriverMatch[] | null>(initialMatches);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La llave pública de los avisos: undefined mientras se pregunta, null si no hay avisos.
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null | undefined>(undefined);

  // Transportistas que le sirven ahora, desde el servidor: al abrir la
  // pantalla, al volver a la app, cada minuto mientras la tiene abierta y
  // apenas un transportista de ese día se pone disponible o cambia la suya.
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
            onEnd();
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
    // Primero los datos de Realtime y avisos: las acciones del servidor van
    // una detrás de otra, y esta es rápida porque no toca la base de datos.
    let unlisten = () => {};
    callServer(() => getAlertsConfig()).then((config) => {
      if (cancelled) return;
      if (!("vapidPublicKey" in config)) {
        setVapidPublicKey(null);
        return;
      }
      setVapidPublicKey(config.vapidPublicKey);
      if (config.live) unlisten = listenForDrivers(config.live, date, () => refresh(true));
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
  const when = whenText(request.date, today, tomorrow);

  // No hay precio: lo acuerdan el cliente y el transportista cuando hablan.
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <p className="text-sm">Tu solicitud</p>
        <p className="font-semibold">{route}</p>
        <p className="text-sm">{capitalize(when)}</p>
      </section>

      {matches &&
        (matches.length === 0 ? (
          <section className="card">
            <h2 className="font-semibold">Guardamos tu solicitud</h2>
            <p className="mt-1 text-sm text-muted">
              Ahora mismo no hay transportistas libres para ese viaje. Apenas aparezca uno, te sale aquí
              para que lo llames o le escribas por WhatsApp. Vuelve cuando quieras a mirar. El precio lo
              acuerdan cuando hablen.
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
                  Va de {getCity(m.origin_city)?.name} a{" "}
                  {m.destination_city === ANY_DESTINATION ? "cualquier destino" : getCity(m.destination_city)?.name} ·{" "}
                  {DRIVER_LABOR[m.labor]}
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
        ))}

      {vapidPublicKey !== undefined && (
        <AlertsOptIn id={id} editToken={editToken} vapidPublicKey={vapidPublicKey} />
      )}

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
            Ya conseguí transportista
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={onRestart}>
          Hacer otra solicitud
        </button>
      </div>
    </div>
  );
}

/**
 * "Avísame": un aviso al celular cuando aparece un transportista, aunque tenga
 * la app cerrada. Si ya los aceptó, el teléfono queda ligado a esta solicitud
 * sin preguntar otra vez (por ejemplo, después de "Hacer otra solicitud").
 */
function AlertsOptIn({
  id,
  editToken,
  vapidPublicKey,
}: {
  id: string;
  editToken: string;
  vapidPublicKey: string | null;
}) {
  const [state, setState] = useState<AlertState>("no");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = alertState(vapidPublicKey);
    if (now !== "on") {
      // Notification y PushManager solo existen en el navegador: se leen después de hidratar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(now);
      return;
    }
    // Ya los aceptó: se liga en silencio a esta solicitud. Si no se puede, se
    // le vuelve a ofrecer el botón.
    let cancelled = false;
    getAlertSubscription(vapidPublicKey!, false)
      .then((sub) => (sub ? subscribeToAlerts({ id, editToken, subscription: sub }) : null))
      .then(
        (res) => !cancelled && setState(res?.ok ? "on" : "ask"),
        (err) => {
          console.error(err);
          if (!cancelled) setState("ask");
        },
      );
    return () => {
      cancelled = true;
    };
  }, [id, editToken, vapidPublicKey]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const sub = await getAlertSubscription(vapidPublicKey!, true);
      if (!sub) {
        setState(alertState(vapidPublicKey));
        return;
      }
      const res = await callServer(() => subscribeToAlerts({ id, editToken, subscription: sub }));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setState("on");
    } catch (err) {
      console.error(err);
      setError("No pudimos activar el aviso en este celular.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "no") return null;

  if (state === "on") {
    return <p className="text-sm text-muted">Te avisamos al celular cuando aparezca un transportista.</p>;
  }

  if (state === "iphone") {
    return (
      <section className="card">
        <h2 className="font-semibold">¿Quieres que te avisemos?</h2>
        <p className="mt-1 text-sm text-muted">
          En iPhone, primero agrega Muvia a tu pantalla de inicio: toca el botón de compartir y luego
          &ldquo;Agregar a inicio&rdquo;. Ábrela desde ahí y te podremos avisar cuando aparezca un
          transportista.
        </p>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">¿Te avisamos cuando aparezca un transportista?</h2>
        <p className="mt-1 text-sm text-muted">Te llega un aviso al celular, aunque tengas la app cerrada.</p>
      </div>
      <ErrorNote message={error} />
      <button type="button" className="btn-primary" disabled={busy} onClick={turnOn}>
        {busy ? "Un momento…" : "Sí, avísame"}
      </button>
    </section>
  );
}
