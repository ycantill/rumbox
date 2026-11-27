"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import {
  closeRequest,
  createRequest,
  getLiveConfig,
  getMyRequest,
  type DriverMatch,
} from "@/app/actions";
import {
  CitySelect,
  ConfirmSheet,
  ContactButtons,
  DayPicker,
  ErrorNote,
  Field,
  FieldError,
  InfoNote,
  PrivacyNote,
  ServicePicker,
  Signal,
  SignalDot,
  Symbol,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { BackHome, useActiveScreen } from "@/components/one-at-a-time";
import { getCity } from "@/lib/cities";
import { capitalize, isStillValid, whenText } from "@/lib/dates";
import {
  ANY_DAY,
  ANY_DAY_LABEL,
  ANY_DESTINATION,
  SAME_CITY_ERROR,
  SERVICES,
  isKey,
  type Service,
} from "@/lib/domain";
import { listenForDrivers } from "@/lib/live";
import { KEYS, forget, load, save } from "@/lib/local-store";
import { refreshWhileOpen } from "@/lib/refresh";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { announce } from "@/lib/toast";
import { requestInputError } from "@/lib/validate";

/** La solicitud que el cliente tiene abierta, guardada en su teléfono. Una a la vez. */
export type MyRequest = {
  id: string;
  editToken: string;
  origin: string;
  destination: string;
  date: string;
  /** Lo que necesita. Las guardadas antes de los servicios no lo tienen. */
  service?: Service;
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
  const [service, setService] = useState<Service | "">("");
  const [error, setError] = useState<string | null>(null);
  // "Buscando conductores", mientras se guarda la solicitud.
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  // "Tu solicitud anterior ya pasó", cuando vuelve el formulario porque se venció.
  const [notice, setNotice] = useState<string | null>(null);
  // La solicitud abierta: si hay una, se muestra esa en vez del formulario.
  const [current, setCurrent] = useState<MyRequest | null>(null);
  // Los transportistas que salieron al solicitar; null si la solicitud viene guardada de antes.
  const [matches, setMatches] = useState<DriverMatch[] | null>(null);
  // "Cambiar mi solicitud": vuelve el formulario y la de antes sigue abierta hasta mandar la nueva.
  const [editing, setEditing] = useState(false);
  // "Cambiar" deja una entrada en el historial: así la flecha de atrás del
  // teléfono vuelve a su solicitud en vez de sacarlo de Rumbox (Yohany, 28 de
  // octubre de 2026). true mientras esa entrada sigue ahí.
  const editEntry = useRef(false);
  // Una cosa a la vez en el teléfono: si está como transportista, se va a esa pantalla.
  const screen = useActiveScreen();
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Hace falta saber qué día es hoy para ver si la solicitud guardada ya pasó.
    if (!today) return;
    // Ya no se pide el teléfono (Yohany, 23 de octubre de 2026): se borra el que quedó guardado.
    forget(KEYS.clientPhone);
    let saved = load<MyRequest | null>(KEYS.clientRequest, null);
    // Los encargos y las diligencias salieron (Yohany, 4 de noviembre de
    // 2026) y su solicitud quedó cerrada: vuelve el formulario.
    if (saved?.service && !isKey(SERVICES, saved.service)) {
      save(KEYS.clientRequest, null);
      saved = null;
    }
    if (saved) {
      // El formulario queda con sus datos, para cambiar solo lo que haga falta.
      // localStorage solo existe en el navegador: se lee después de hidratar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrigin(saved.origin);
      setDestination(saved.destination);
      if (saved.service) setService(saved.service);
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

  const input = { origin, destination, date, service };
  // Lo que falta: el botón se ve apagado y, al tocarlo, se dice debajo.
  const invalid = today ? requestInputError(input, today) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Se dice aquí, con el tono de la app y aunque no haya señal.
    if (invalid) {
      setError(invalid);
      return;
    }
    setSearching(true);
    startTransition(async () => {
      const [res] = await Promise.all([
        callServer(() =>
          createRequest({
            ...input,
            // Una solicitud a la vez: la nueva reemplaza la que estaba abierta.
            replaces: current ? { id: current.id, editToken: current.editToken } : undefined,
          }),
        ),
        // "Buscando conductores" se alcanza a leer aunque el servidor conteste rápido.
        new Promise((resolve) => setTimeout(resolve, 1400)),
      ]);
      setSearching(false);
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
        service: service as Service,
      };
      save(KEYS.clientRequest, mine);
      setCurrent(mine);
      setNotice(null);
      setMatches(res.matches);
      setEditing(false);
      // La entrada de "Cambiar" ya no sirve: atrás no debe volver al formulario.
      if (editEntry.current) {
        editEntry.current = false;
        window.history.back();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Se arrepintió de cambiarla: vuelve a su solicitud y lo que alcanzó a
  // cambiar se descarta, para que la próxima vez el formulario la traiga igual.
  function stopEditing() {
    if (current) {
      setOrigin(current.origin);
      setDestination(current.destination);
      setDate(current.date);
      setService(current.service ?? "");
    }
    setEditing(false);
    setError(null);
  }
  const onBack = useEffectEvent(() => {
    if (!editEntry.current) return;
    editEntry.current = false;
    stopEditing();
  });

  // La flecha de atrás mientras cambia su solicitud.
  useEffect(() => {
    if (!editing) return;
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [editing]);

  if (!loaded || (!current && screen === "/transportista")) return null;

  if (searching) {
    return (
      <div role="status" className="flex min-h-[70vh] flex-col items-center justify-center gap-7 text-center">
        <span className="grid size-[90px] place-items-center">
          <Signal size={70}>
            <Symbol size={64} />
          </Signal>
        </span>
        <p className="font-display text-[32px] font-black uppercase leading-none">Buscando conductores</p>
        <p className="text-[15px] text-muted">
          {getCity(origin)?.name} → {getCity(destination)?.name}
        </p>
      </div>
    );
  }

  if (current && !editing) {
    return (
      <MyRequestView
        key={current.id}
        request={current}
        matches={matches}
        onRestart={() => {
          // El formulario vuelve con los mismos datos, para cambiar solo lo que haga falta.
          window.history.pushState(null, "");
          editEntry.current = true;
          setEditing(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onEnd={(reason) => {
          save(KEYS.clientRequest, null);
          // La cerró él: vuelve al inicio con el aviso (Yohany, 27 de octubre de 2026).
          if (reason === "closed") {
            // La pantalla queda guardada al irse (Next la conserva): sin esto,
            // al volver a pedir saldría otra vez la solicitud que cerró.
            setCurrent(null);
            setMatches(null);
            setNotice(null);
            announce("Listo. Cerramos su solicitud.");
            router.push("/");
            return;
          }
          // Se cerró en el servidor o pasó el día: vuelve el formulario con sus datos.
          setNotice(reason === "expired" ? EXPIRED_NOTICE : null);
          setCurrent(null);
          setMatches(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Si tocó "Cambiar" y se arrepiente, vuelve a su solicitud sin cambiarla. */}
      {current ? (
        <button
          type="button"
          // Igual que la flecha de atrás del teléfono.
          onClick={() => (editEntry.current ? window.history.back() : stopEditing())}
          className="self-start text-[15px] text-muted"
        >
          ← Volver
        </button>
      ) : (
        <BackHome />
      )}
      <h1 className="title">¿Qué necesita?</h1>
      <InfoNote message={notice} />
      {/* noValidate: el navegador no muestra su propio globito; los errores salen abajo, con nuestras palabras. */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <fieldset className="-mt-2">
          <legend className="sr-only">¿Qué necesita?</legend>
          <ServicePicker value={service} onChange={setService} />
          {service && <p className="mt-3 text-sm leading-snug text-muted">{SERVICES[service].hint}</p>}
        </fieldset>

        {/* La ruta, como en una guía de envío. El origen no sale en la lista
            del destino. El aviso queda para lo guardado de antes. */}
        <Field label="Ruta">
          <div className="flex flex-col rounded-md border border-line bg-paper">
            <div className="relative border-b border-line-soft px-3.5 py-2.5">
              <span aria-hidden className="guide-label block">
                Desde
              </span>
              <CitySelect name="origin" label="Desde" variant="guide" value={origin} onChange={setOrigin} exclude={destination} />
            </div>
            <div className="relative px-3.5 py-2.5">
              <span aria-hidden className="guide-label block">
                Hasta
              </span>
              <CitySelect
                name="destination"
                label="Hasta"
                variant="guide"
                value={destination}
                onChange={setDestination}
                exclude={origin}
              />
            </div>
          </div>
          <FieldError message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </Field>

        <Field label="¿Para cuándo?">
          <DayPicker value={date} onChange={setDate} anyDay />
        </Field>

        <div className="flex flex-col gap-3.5">
          <PrivacyNote>Guardamos su solicitud solo mientras esté abierta.</PrivacyNote>
          <button
            type="submit"
            className={`btn-primary ${invalid ? "opacity-60" : ""}`}
            disabled={isPending}
          >
            Buscar conductor
          </button>
          <FieldError message={error} center />
        </div>
      </form>
    </div>
  );
}

const EXPIRED_NOTICE = "Su solicitud anterior ya pasó. Si todavía necesita el servicio, haga una nueva.";

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
  onEnd: (reason?: "expired" | "closed") => void;
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
    setConfirmEnd(false);
    // Si el servidor ya no la tiene, tampoco les sale a los transportistas.
    if (!res.ok && !("gone" in res && res.gone)) {
      setError(res.error);
      return;
    }
    onEnd("closed");
  }

  const from = getCity(request.origin)?.name;
  const to = getCity(request.destination)?.name;
  const anyDay = request.date === ANY_DAY;
  const whenOf = (date: string) => whenText(date, today, tomorrow);
  const what = requestService(request);

  // No hay precio: lo acuerdan el cliente y el conductor cuando hablan.
  return (
    <div className="flex flex-col gap-[22px]">
      {/* "Su solicitud", como una guía de envío. */}
      <section className="rounded-lg border border-line bg-paper">
        <div className="flex items-center justify-between rounded-t-[7px] bg-ink px-3.5 py-2.5 text-white">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Su solicitud</h2>
          <button type="button" onClick={onRestart} className="text-[13px] font-semibold text-accent">
            Cambiar
          </button>
        </div>
        <dl className="grid grid-cols-2">
          <GuideCell label="Desde" className="border-b border-r border-line-soft">
            <span className="font-display text-2xl font-extrabold uppercase leading-none">{from}</span>
          </GuideCell>
          <GuideCell label="Hasta" className="border-b border-line-soft">
            <span className="font-display text-2xl font-extrabold uppercase leading-none">{to}</span>
          </GuideCell>
          <GuideCell label="Servicio" className="border-r border-line-soft">
            <span className="text-[15px] font-semibold">{what}</span>
          </GuideCell>
          <GuideCell label="Cuándo">
            <span className="text-[15px] font-semibold">{anyDay ? ANY_DAY_LABEL : capitalize(whenOf(request.date))}</span>
          </GuideCell>
        </dl>
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          className="w-full rounded-b-[7px] border-t border-line-soft bg-surface p-[13px] text-[15px] font-semibold hover:bg-bg"
        >
          Ya no necesito el servicio
        </button>
      </section>

      {/* Es una pantalla de espera: mientras no haya conductores, o hasta
          que llegue la lista, se ve que seguimos buscando. */}
      {!matches || matches.length === 0 ? (
        <Searching />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[30px] font-black uppercase leading-none">
              {matches.length === 1 ? "1 conductor va para allá" : `${matches.length} conductores van para allá`}
            </h2>
            <p className="text-[15px] text-muted">Llame o escriba y acuerden el precio.</p>
          </div>
          <div className="flex flex-col gap-3">
            {matches.map((m) => {
              // ↑ Va directo a su destino (o a cualquiera); ↗ pasa por su destino y sigue.
              const direct = m.destination_city === ANY_DESTINATION || m.destination_city === request.destination;
              const sale = m.service_date > today ? whenOf(m.service_date) : "hoy";
              return (
                <article key={m.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                  <div className="flex items-start gap-3.5 p-4">
                    <span
                      aria-hidden
                      className={`grid size-11 shrink-0 place-items-center rounded-md font-display text-2xl font-black ${
                        direct ? "bg-brand text-white" : "border border-line bg-accent text-ink"
                      }`}
                    >
                      {direct ? "↑" : "↗"}
                    </span>
                    <div className="flex flex-col gap-[3px]">
                      <p className="text-[17px] font-bold leading-snug">
                        Sale {sale} de {getCity(m.origin_city)?.name}
                      </p>
                      <p className="text-sm leading-snug text-muted">
                        {m.destination_city === ANY_DESTINATION
                          ? "va a cualquier destino"
                          : direct
                            ? `va a ${to}`
                            : `pasa por ${to}`}
                      </p>
                      {m.services && (
                        <p className="text-[13px] text-[#3a4558]">
                          {m.services.map((s) => SERVICES[s].plural).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-dashed border-line px-4 py-3">
                    <ContactButtons
                      availabilityId={m.id}
                      phone={m.whatsapp}
                      message={`Hola, lo encontré en Rumbox. Necesito un servicio${request.service ? ` de ${SERVICES[request.service].label.toLowerCase()}` : ""} de ${from} a ${to}${anyDay ? "" : ` para ${whenOf(request.date)}`}. ¿Me puede ayudar?`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <p className="flex flex-wrap gap-4 text-[13px] text-muted">
            <span>
              <b className="text-brand">↑</b> Va directo
            </span>
            <span>
              <b>↗</b> Pasa por su destino
            </span>
          </p>
          <p role="status" className="flex items-center gap-3.5 rounded-md bg-notice p-3.5 text-[15px] leading-snug">
            <SignalDot />
            Seguimos buscando conductores. Vuelva a mirar más tarde.
          </p>
        </>
      )}

      <ErrorNote message={error} />
      <ConfirmSheet
        open={confirmEnd}
        title="¿Cerrar su solicitud?"
        body="Los conductores ya no la verán. Si la necesita otra vez, tendrá que pedirla de nuevo."
        yes="Sí, ya no lo necesito"
        no="No, seguir buscando"
        busy={busy}
        onYes={end}
        onNo={() => setConfirmEnd(false)}
      />
      <div className="flex flex-col gap-2.5">
        <Link href="/ayuda" className="pt-1.5 text-center text-[15px] text-brand underline">
          Qué hacer si lo estafan
        </Link>
      </div>
    </div>
  );
}

/** El servicio que pidió. No se pregunta el tamaño (Yohany, 28 de octubre de 2026). */
function requestService(request: MyRequest): string {
  // Las guardadas antes de los servicios le sirven a cualquiera.
  return request.service ? SERVICES[request.service].label : "Cualquiera";
}

/** Una casilla de la guía: el rótulo en mayúsculas pequeñas y el dato. */
function GuideCell({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col px-3.5 py-2.5 ${className}`}>
      <dt className="guide-label">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Mientras no hay conductores: la solicitud quedó guardada y seguimos buscando. */
function Searching() {
  return (
    <section role="status" className="flex flex-col items-center gap-3.5 rounded-lg bg-notice px-[22px] py-8 text-center">
      <span className="grid size-[84px] place-items-center">
        <Signal size={70}>
          <Symbol size={60} />
        </Signal>
      </span>
      <h2 className="font-display text-[30px] font-black uppercase leading-none">Buscando conductores...</h2>
      <p className="text-base leading-normal text-[#4a5568] text-pretty">
        Su solicitud quedó guardada. Cuando un conductor vaya para allá, le sale aquí para que lo llame o le escriba por
        WhatsApp.
      </p>
      <p className="self-stretch border-t border-[#e3d9c6] pt-3.5 text-[15px] font-bold leading-snug">
        Entre a Rumbox cada tanto para mirar.
      </p>
    </section>
  );
}
