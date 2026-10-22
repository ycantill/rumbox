"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getMyAvailability,
  publishAvailability,
  updateAvailability,
  updateLocation,
  updateSpace,
} from "@/app/actions";
import {
  CitySelect,
  Choices,
  DayPicker,
  ErrorNote,
  Field,
  OriginCitySelect,
  PrivacyNote,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { useActiveScreen } from "@/components/one-at-a-time";
import { getCity, nearestCity } from "@/lib/cities";
import { whenText } from "@/lib/dates";
import {
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  destinationName,
  isKey,
  type DriverSpace,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { refreshWhileOpen } from "@/lib/refresh";
import { routeProgress, routeStops } from "@/lib/route";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { driverInputError } from "@/lib/validate";
import { formatWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";

// Lo guardado antes puede traer también la ayuda para cargar, que ya no se pregunta.
type Profile = { whatsapp: string };

export type MyPost = {
  id: string;
  editToken: string;
  origin: string;
  // Un municipio o "cualquiera" (Cualquier destino). null en los guardados
  // cuando el destino era opcional.
  destination: string | null;
  date: string; // desde qué día viaja
  space: DriverSpace;
  // Lo que podía llevar al ponerse disponible; `space` es lo que le queda, que
  // él cambia en su tarjeta. Con esto vuelve el formulario, para el próximo viaje.
  fullSpace?: DriverSpace;
  // El municipio por donde va, si ya lo marcó con la ubicación del teléfono.
  current?: string | null;
  // La carretera de su viaje (`encodePath`), para "¿Por dónde vas?". Sin ella,
  // la línea recta.
  route?: string | null;
};

export function DriverForm() {
  const { today } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = useServiceDay(pickedDate);
  const [space, setSpace] = useState<DriverSpace | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Si se acaba de poner disponible: el título dice "¡Listo!".
  const [justPublished, setJustPublished] = useState(false);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Un trabajo a la vez: si ya hay uno, se muestra ese en vez del formulario.
  const current = posts[0];
  // Una cosa a la vez en el teléfono: si tiene una solicitud abierta, se va a esa pantalla.
  const screen = useActiveScreen();

  // Precarga el número desde el teléfono.
  useEffect(() => {
    const p = load<Profile>(KEYS.driverProfile, { whatsapp: "" });
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(p.whatsapp);
    setPosts(load<MyPost[]>(KEYS.driverPosts, []));
    setLoaded(Boolean(today));
  }, [today]);

  function updateCurrent(p: MyPost) {
    setPosts([p]);
    save(KEYS.driverPosts, [p]);
  }

  // Cambia solo una parte, sobre lo último guardado: lo que llega de una
  // consulta o de la ubicación no pisa lo que cambió mientras tanto.
  const patchCurrent = useCallback((patch: Partial<MyPost>) => {
    setPosts((ps) => {
      if (!ps[0]) return ps;
      const p = { ...ps[0], ...patch };
      save(KEYS.driverPosts, [p]);
      return [p];
    });
  }, []);

  function endCurrent() {
    // El formulario vuelve con los datos de antes, para ponerse otra vez con un toque.
    if (current) {
      setOrigin(current.origin);
      setDestination(current.destination ?? "");
      // Lo que podía llevar al empezar, no lo que le quedó libre al final del viaje.
      const space = current.fullSpace ?? current.space;
      // El baúl o los asientos de un carro particular ya no son una opción.
      if (isKey(DRIVER_SPACES, space)) setSpace(space);
    }
    setPosts([]);
    setJustPublished(false);
    save(KEYS.driverPosts, []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Lo que falta se dice aquí, con el tono de la app y aunque no haya señal.
    const input = { origin, destination, date, space, whatsapp };
    const invalid = driverInputError(input, today);
    if (invalid) {
      setError(invalid);
      return;
    }
    startTransition(async () => {
      const res = await callServer(() => publishAvailability(input));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      save(KEYS.driverProfile, { whatsapp } satisfies Profile);
      const post: MyPost = {
        id: res.id,
        editToken: res.editToken,
        origin,
        destination,
        date,
        space: space as DriverSpace,
        route: res.route,
      };
      updateCurrent(post);
      setJustPublished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!loaded || (!current && screen === "/solicitar")) return null;

  if (current) {
    return (
      <CurrentWork
        key={current.id}
        post={current}
        phone={normalizeWhatsApp(whatsapp)}
        justPublished={justPublished}
        onChange={updateCurrent}
        onPatch={patchCurrent}
        onEnd={endCurrent}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="-mt-4 text-sm text-muted">
        Cuéntanos hacia dónde vas y qué día viajas. No tienes que crear cuenta ni pagar comisiones.
      </p>
      {/* noValidate: el navegador no muestra su propio globito; los errores salen abajo, con nuestras palabras. */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Field label="¿Dónde estás?">
          <OriginCitySelect
            name="origin"
            value={origin}
            onChange={setOrigin}
            exclude={destination}
            onClearExclude={() => setDestination("")}
          />
        </Field>

        {/* El match va por el corredor del viaje (Modo Ruta) o, con "Cualquier
            destino", por el municipio de donde sale. Es lógica interna: el
            transportista no la ve. */}
        <Field label="¿Hacia dónde vas?">
          {/* "Cualquier destino" es la primera opción de la lista. El origen no
              sale en ella y "Ubicarme" borra el destino si es el mismo. El aviso queda para lo guardado de antes. */}
          <CitySelect name="destination" value={destination} onChange={setDestination} exclude={origin} anyDestination />
          <ErrorNote message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </Field>

        {/* "Hoy" viene elegido. Viaja desde ese día en adelante, hasta que se apague. */}
        <Field label="¿Qué día viajas?">
          <DayPicker value={date} onChange={setDate} />
        </Field>

        {/* La misma lista de tamaños que elige el cliente. */}
        <Field label="¿Cuánto puedes llevar?">
          <Choices options={DRIVER_SPACES} value={space} onChange={setSpace} columns={1} />
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

        <PrivacyNote>Al continuar, aceptas que los clientes vean tu número mientras dure este viaje.</PrivacyNote>
        <ErrorNote message={error} />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Un momento…" : "Ponerme disponible"}
        </button>
      </form>
    </div>
  );
}

function CurrentWork({
  post,
  phone,
  justPublished,
  onChange,
  onPatch,
  onEnd,
}: {
  post: MyPost;
  /** El teléfono con que se puso disponible, para que vea si quedó bien. */
  phone: string | null;
  justPublished: boolean;
  onChange: (p: MyPost) => void;
  onPatch: (patch: Partial<MyPost>) => void;
  onEnd: () => void;
}) {
  const { today, tomorrow } = useBogotaDates();
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No se vence (Yohany, 21 de octubre de 2026): sigue hasta "Ya no estoy
  // disponible". Lo guardado de antes sin destino o con el espacio de un carro
  // particular (baúl o asientos) vuelve al formulario: tiene que elegir otra vez.
  const ended = !post.destination || !isKey(DRIVER_SPACES, post.space);

  // Si sigue encendida y con cuánto espacio, desde el servidor: al abrir la
  // pantalla, al volver a la app y cada minuto mientras la tiene abierta. No ve
  // a los clientes: por su privacidad, ellos son los que lo llaman.
  const { id, editToken } = post;
  const fresh = justPublished;
  // Número de la última consulta: una respuesta vieja no pisa una más nueva ni
  // lo que acaba de cambiar.
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
          onPatch({ space: res.space, fullSpace: res.fullSpace, current: res.currentCity, route: res.route });
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

  // Lo que no sirve no se alcanza a mostrar: con un espacio o una fecha que ya no
  // existen, la pantalla se rompía antes de volver al formulario.
  if (ended) return null;


  // "¿Cuánto espacio te queda?": a los clientes solo les sale si les cabe.
  async function changeSpace(space: DriverSpace) {
    const before = post;
    setBusy(true);
    setError(null);
    latest.current++;
    onChange({ ...post, space, fullSpace: post.fullSpace ?? post.space });
    const res = await callServer(() => updateSpace({ id, editToken, space }));
    latest.current++;
    setBusy(false);
    if (!res.ok) {
      onChange(before);
      setError(res.error);
    }
  }

  async function end() {
    setBusy(true);
    setError(null);
    // Lo que traiga una consulta que salió antes o durante el cambio ya no sirve.
    latest.current++;
    // Se apaga en el servidor para que ningún cliente lo vea, y se olvida en el teléfono.
    const res = await callServer(() => updateAvailability({ id, editToken, status: "llena" }));
    latest.current++;
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onEnd();
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
        <dt className="sr-only">Desde qué día</dt>
        {/* Viaja desde su día en adelante: si ya pasó, desde hoy. */}
        <dd>Viajas desde {whenText(post.date > today ? post.date : today, today, tomorrow)}</dd>
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

      <WhereYouAre post={post} latest={latest} onPatch={onPatch} />

      <SpaceLeft space={post.space} busy={busy} onChange={changeSpace} />

      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
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
            Ya no estoy disponible
          </button>
        )}
      </div>

    </div>
  );
}

/**
 * "¿Cuánto espacio te queda?": cuando carga o descarga, él mismo cambia lo que
 * le queda, y los clientes solo lo ven si les cabe. Tiene todas las opciones:
 * pudo empezar lleno y descargar en el camino.
 */
function SpaceLeft({
  space,
  busy,
  onChange,
}: {
  space: DriverSpace;
  busy: boolean;
  onChange: (space: DriverSpace) => void;
}) {
  return (
    <section className="card flex flex-col gap-2">
      <label htmlFor="space-left" className="font-semibold">
        ¿Cuánto espacio te queda?
      </label>
      <select
        id="space-left"
        className="input"
        value={space}
        disabled={busy}
        onChange={(e) => {
          if (isKey(DRIVER_SPACES, e.target.value)) onChange(e.target.value);
        }}
      >
        {(Object.keys(DRIVER_SPACES) as DriverSpace[]).map((s) => (
          <option key={s} value={s}>
            {DRIVER_SPACES[s].label}
          </option>
        ))}
      </select>
      <p className="text-sm text-muted">Cámbialo cuando cargues o descargues. Solo te ven los clientes a los que les cabe.</p>
    </section>
  );
}

/**
 * "¿Por dónde vas?": su ruta pueblo por pueblo y por dónde va. La ubicación
 * se pide con el botón y, si ya dio permiso, se actualiza sola al abrir la
 * pantalla, al volver a la app y cada minuto mientras la tiene abierta. Solo
 * se guarda el municipio más cercano. Los clientes no lo ven (Yohany, 21 de
 * octubre de 2026): les deja de salir si su pueblo ya quedó atrás.
 */
function WhereYouAre({
  post,
  latest,
  onPatch,
}: {
  post: MyPost;
  /** El número de la última consulta de la tarjeta: una vieja no pisa por dónde va. */
  latest: React.RefObject<number>;
  onPatch: (patch: Partial<MyPost>) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);
  const { id, editToken, origin } = post;
  const destination = post.destination ?? "";
  const route = post.route;
  const stops = useMemo(() => routeStops(origin, destination, route), [origin, destination, route]);
  const here = getCity(post.current);
  const progress = post.current ? routeProgress(origin, destination, post.current, route) : null;

  // Lo último que se mandó al servidor, para no mandar dos veces el mismo pueblo.
  const sent = useRef(post.current ?? null);

  const locate = useCallback(
    (quiet: boolean) => {
      if (!navigator.geolocation) {
        if (!quiet) setFailed(true);
        return;
      }
      if (!quiet) {
        setLocating(true);
        setFailed(false);
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setLocating(false);
          setFailed(false);
          const slug = nearestCity(pos.coords.latitude, pos.coords.longitude).slug;
          onPatch({ current: slug });
          if (sent.current === slug) return;
          latest.current++;
          const res = await callServer(() => updateLocation({ id, editToken, city: slug }));
          latest.current++;
          if (res.ok) sent.current = slug;
        },
        () => {
          // No dio permiso, el teléfono no supo dónde está o se demoró.
          setLocating(false);
          if (!quiet) setFailed(true);
        },
        { timeout: 15_000, maximumAge: 60_000 },
      );
    },
    [id, editToken, latest, onPatch],
  );

  // Si ya dio permiso, se actualiza solo. Si no, espera a que toque el botón:
  // el teléfono no le pregunta nada sin que él lo pida.
  useEffect(() => {
    let cancelled = false;
    async function ifAllowed() {
      try {
        const status = await navigator.permissions?.query({ name: "geolocation" });
        if (!cancelled && status?.state === "granted") locate(true);
      } catch {
        // Un navegador que no deja preguntar por el permiso: solo con el botón.
      }
    }
    void ifAllowed();
    const stop = refreshWhileOpen(() => void ifAllowed());
    return () => {
      cancelled = true;
      stop();
    };
  }, [locate]);

  // Por dónde va, dentro de la lista: en el pueblo de la ruta donde está, o
  // entre los dos pueblos por donde pasa.
  const hereIndex = here ? stops.findIndex((s) => s.city.slug === here.slug) : -1;
  const passed = (t: number) => progress !== null && t < progress;
  const next = progress === null ? -1 : stops.findIndex((s) => s.t > progress);
  const between = !here || hereIndex !== -1 || progress === null ? -1 : next === -1 ? stops.length : next;

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="font-semibold">¿Por dónde vas?</h2>
      {stops.length > 0 ? (
        <ol className="flex flex-col">
          {stops.map((stop, i) => (
            <Fragment key={stop.city.slug}>
              {i === between && here && <HereRow name={here.name} />}
              <li className="flex items-center gap-3 py-1.5">
                <span
                  aria-hidden
                  className={
                    i === hereIndex
                      ? "size-4 shrink-0 rounded-full bg-brand ring-4 ring-brand-soft"
                      : passed(stop.t)
                        ? "size-3 shrink-0 rounded-full bg-muted/40"
                        : "size-3 shrink-0 rounded-full border-2 border-brand"
                  }
                />
                <span
                  className={
                    i === hereIndex ? "font-semibold" : passed(stop.t) ? "text-muted line-through" : undefined
                  }
                >
                  {stop.city.name}
                </span>
                {i === hereIndex && <span className="text-sm font-semibold text-brand">Vas por aquí</span>}
              </li>
            </Fragment>
          ))}
          {between === stops.length && here && <HereRow name={here.name} />}
        </ol>
      ) : (
        here && <p className="font-semibold">Vas por {here.name}</p>
      )}
      <p className="text-sm text-muted">
        {here
          ? "Mientras tengas Mudavía abierta, se actualiza sola."
          : "Toca el botón para que tu teléfono diga por dónde vas. Así te llaman los clientes que te quedan de camino."}
      </p>
      <button type="button" className="btn-secondary" disabled={locating} onClick={() => locate(false)}>
        {locating ? "Un momento…" : here ? "Actualizar por dónde voy" : "Marcar por dónde voy"}
      </button>
      <ErrorNote
        message={failed ? "No pudimos saber dónde estás. Revisa que Mudavía tenga permiso para ver tu ubicación." : null}
      />
    </section>
  );
}

/** "Vas por …" entre dos pueblos de la ruta. */
function HereRow({ name }: { name: string }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span aria-hidden className="size-4 shrink-0 rounded-full bg-brand ring-4 ring-brand-soft" />
      <span className="font-semibold">Vas por {name}</span>
    </li>
  );
}
