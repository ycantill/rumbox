"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getMyAvailability,
  publishAvailability,
  updateAvailability,
  updateLocation,
  updateSpace,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import {
  CitySelect,
  ConfirmSheet,
  DayPicker,
  ErrorNote,
  Field,
  FieldError,
  PrivacyNote,
  SafetyTips,
  ServiceChecklist,
  SignalDot,
  SpacePicker,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { BackHome, useActiveScreen } from "@/components/one-at-a-time";
import { getCity } from "@/lib/cities";
import { capitalize, whenText } from "@/lib/dates";
import {
  DRIVER_SPACES,
  MOVING_SPACES,
  SAME_CITY_ERROR,
  SERVICES,
  destinationName,
  isKey,
  type DriverSpace,
  type MovingSpace,
  type Service,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { isAppleMobile, mapsUrl } from "@/lib/maps";
import { refreshWhileOpen } from "@/lib/refresh";
import { routeProgress, routeStops } from "@/lib/route";
import { DRIVER_TIPS } from "@/lib/safety";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { announce } from "@/lib/toast";
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
  /** Los servicios que hace. Los guardados antes de los servicios no los tienen. */
  services?: Service[] | null;
  space: DriverSpace;
  // Lo que podía llevar al ponerse disponible; `space` es lo que le queda, que
  // él cambia en su tarjeta. Con esto vuelve el formulario, para el próximo viaje.
  fullSpace?: DriverSpace;
  // El municipio por donde va, si ya lo marcó con la ubicación del teléfono.
  current?: string | null;
  // La carretera de su viaje (`encodePath`), para "¿Por dónde vas?". Sin ella,
  // la línea recta.
  route?: string | null;
  // Si ya tocó "Comienza tu viaje": entonces dice "Continúa tu viaje".
  started?: boolean;
};

export function DriverForm() {
  const { today } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = useServiceDay(pickedDate);
  const [services, setServices] = useState<Service[]>([]);
  // Solo si hace mudanzas: una habitación o una casa.
  const [space, setSpace] = useState<MovingSpace | "">("");
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
  const router = useRouter();

  // Precarga el número desde el teléfono.
  useEffect(() => {
    const p = load<Profile>(KEYS.driverProfile, { whatsapp: "" });
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(phoneInput(p.whatsapp));
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

  function endCurrent(reason?: "closed") {
    // Lo apagó él: vuelve al inicio con el aviso (Yohany, 27 de octubre de 2026).
    if (reason === "closed") {
      save(KEYS.driverPosts, []);
      announce("Ya no aparece en las búsquedas. Buen viaje.");
      router.push("/");
      return;
    }
    // Se apagó en el servidor o es de antes: el formulario vuelve con los
    // mismos datos, para ponerse otra vez con un toque.
    if (current) {
      setOrigin(current.origin);
      setDestination(current.destination ?? "");
      if (current.services) setServices(current.services);
      // Lo que podía llevar al empezar, no lo que le quedó libre al final del viaje.
      const space = current.fullSpace ?? current.space;
      // Solo las dos de la mudanza son una opción.
      if (isKey(MOVING_SPACES, space)) setSpace(space);
    }
    setPosts([]);
    setJustPublished(false);
    save(KEYS.driverPosts, []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const input = { origin, destination, date, services, space, whatsapp };
  // Lo que falta: el botón se ve apagado y, al tocarlo, se dice debajo.
  const invalid = today ? driverInputError(input, today) : null;
  const moving = services.includes("mudanza");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Se dice aquí, con el tono de la app y aunque no haya señal.
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
        services,
        space: res.space,
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
    <div className="flex flex-col gap-6">
      <BackHome />
      <div className="flex flex-col gap-2">
        <h1 className="title">¿Hacia dónde va?</h1>
        <p className="text-base leading-snug text-muted">Lo llaman los clientes que le quedan de camino.</p>
      </div>
      {/* noValidate: el navegador no muestra su propio globito; los errores salen abajo, con nuestras palabras. */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        {/* La guía: dónde está y a dónde va. El match va por el corredor del
            viaje o, con "Cualquier destino" (la primera opción de la lista), por
            el municipio de donde sale. Es lógica interna: no la ve. El origen no
            sale en la lista del destino. El aviso queda para lo guardado de antes. */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col rounded-md border border-line bg-paper">
            <div className="relative min-w-0 border-b border-line-soft px-3.5 py-2.5">
              <span aria-hidden className="guide-label block">
                Está en
              </span>
              <CitySelect name="origin" label="Está en" variant="guide" value={origin} onChange={setOrigin} exclude={destination} />
            </div>
            <div className="relative min-w-0 px-3.5 py-2.5">
              <span aria-hidden className="guide-label block">
                Va a
              </span>
              <CitySelect
                name="destination"
                label="Va a"
                variant="guide"
                value={destination}
                onChange={setDestination}
                exclude={origin}
                anyDestination
              />
            </div>
          </div>
          <FieldError message={origin && origin === destination ? SAME_CITY_ERROR : null} />
        </div>

        {/* "Hoy" viene elegido. Viaja desde ese día en adelante, hasta que se apague. */}
        <Field label="¿Qué día sale?">
          <DayPicker value={date} onChange={setDate} />
        </Field>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 flex flex-col gap-0.5">
            <span className="label">¿Qué servicios hace?</span>
            <span className="text-sm text-muted">Puede elegir varios.</span>
          </legend>
          <ServiceChecklist value={services} onChange={setServices} />
        </fieldset>

        {/* Solo si hace mudanzas, con los tamaños de la mudanza del cliente. */}
        {moving && (
          <Field label="¿Cuánto espacio tiene?">
            <SpacePicker value={space} onChange={setSpace} />
          </Field>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="label">
            Su teléfono
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input py-[15px] text-[19px] font-medium tracking-[0.03em]"
            placeholder="300 123 4567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(phoneInput(e.target.value))}
            required
          />
          <p className="text-sm text-muted">Aquí lo llaman o le escriben por WhatsApp.</p>
        </div>

        <div className="flex flex-col gap-3.5">
          <PrivacyNote>Su número se ve solo durante este viaje.</PrivacyNote>
          <button type="submit" className={`btn-primary ${invalid ? "opacity-50" : ""}`} disabled={isPending}>
            {isPending ? "Un momento…" : "Ponerme disponible"}
          </button>
          <FieldError message={error} center />
        </div>
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
  onEnd: (reason?: "closed") => void;
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
          onPatch({
            space: res.space,
            fullSpace: res.fullSpace,
            current: res.currentCity,
            route: res.route,
            services: res.services,
          });
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
    setConfirmEnd(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onEnd("closed");
  }

  // Viaja desde su día en adelante: si ya pasó, desde hoy.
  const sale = whenText(post.date > today ? post.date : today, today, tomorrow);

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="bleed flex flex-col gap-4 bg-ink px-[22px] pb-[22px] pt-[26px] text-white">
        <h1 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-accent">
          <SignalDot className="bg-accent" />
          Usted está disponible
        </h1>
        {/* El aviso de la vía: de dónde sale, a dónde va y qué servicios hace. */}
        <div className="rounded-lg bg-brand p-1.5">
          <div className="flex flex-col gap-3 rounded-[5px] border-[1.5px] border-white/40 p-4">
            <p className="font-display text-4xl font-black uppercase leading-[0.95]">
              {getCity(post.origin)?.name}
              <br />
              <span aria-hidden className="text-accent">
                ↑
              </span>
              <span className="sr-only">a</span> {destinationName(post.destination)}
            </p>
            {post.services && post.services.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {post.services.map((s) => (
                  <li key={s} className="rounded-[3px] bg-accent px-2 py-[3px] text-xs font-bold uppercase text-ink">
                    {SERVICES[s].plural}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-[15px] leading-snug text-on-brand-muted">
          {capitalize(`sale ${sale}.`)}{" "}
          {phone ? (
            <>
              Lo llaman o le escriben al <b className="text-white">{formatWhatsApp(phone)}</b>.
            </>
          ) : (
            "Lo llaman o le escriben por WhatsApp."
          )}
        </p>
        <StartTrip post={post} onStart={() => onPatch({ started: true })} />
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          className="rounded-md border border-white/35 p-[13px] text-[15px] font-semibold text-white hover:bg-white/8"
        >
          Ya no estoy disponible
        </button>
      </section>

      <ErrorNote message={error} />

      <WhereYouAre post={post} latestRef={latest} onPatch={onPatch} />

      {/* Solo si hace mudanzas (las de antes, sin servicios, hacen todo). */}
      {(!post.services || post.services.includes("mudanza")) && (
        <SpaceLeft space={post.space} busy={busy} onChange={changeSpace} />
      )}

      <SafetyTips tips={DRIVER_TIPS} />

      <ConfirmSheet
        open={confirmEnd}
        title="¿Dejar de estar disponible?"
        body="Los clientes de esta ruta ya no lo verán ni podrán llamarlo. Puede ponerse disponible otra vez cuando quiera."
        yes="Sí, ya no estoy disponible"
        no="No, seguir disponible"
        busy={busy}
        onYes={end}
        onNo={() => setConfirmEnd(false)}
      />
    </div>
  );
}

/**
 * "Comenzar viaje en Maps" (Yohany, 22 de octubre de 2026): abre el mapa con
 * el camino hasta su destino, para que no lo tenga que escribir: Google Maps en
 * Android y Mapas en iPhone. Si ya lo tocó o ya marcó un pueblo en "¿Por dónde
 * va?", va de camino: "Continuar viaje en Maps". Con "Cualquier destino" no
 * hay a dónde llevarlo.
 */
function StartTrip({ post, onStart }: { post: MyPost; onStart: () => void }) {
  // La tarjeta sale después de leer el teléfono, así que ya hay navegador.
  const [apple] = useState(
    () => typeof navigator !== "undefined" && isAppleMobile(navigator.userAgent, navigator.maxTouchPoints),
  );
  const destination = post.destination ? getCity(post.destination) : undefined;
  if (!destination) return null;
  const started = post.started || Boolean(post.current && post.current !== post.origin);
  return (
    <a
      href={mapsUrl(destination, apple)}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg bg-accent p-4 text-center font-display text-2xl font-black uppercase leading-none text-ink active:translate-y-px"
      onClick={onStart}
    >
      {started ? "Continuar viaje en Maps" : "Comenzar viaje en Maps"}
    </a>
  );
}

/**
 * "¿Cuánto espacio tiene ahora?": cuando carga o descarga, él mismo cambia lo
 * que le queda, y los clientes de mudanza solo lo ven si les cabe. Son las dos
 * tarjetas de la mudanza: puede subir, porque pudo empezar lleno y descargar
 * en el camino.
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
    <section className="flex flex-col gap-3 rounded-lg border border-line-soft bg-surface p-[18px]">
      <h2 className="card-title">¿Cuánto espacio tiene ahora?</h2>
      <fieldset disabled={busy}>
        <legend className="sr-only">¿Cuánto espacio tiene ahora?</legend>
        <SpacePicker value={space} onChange={(s) => s !== space && onChange(s)} />
      </fieldset>
      <p className="text-sm leading-snug text-muted">Cámbielo cuando cargue o descargue.</p>
    </section>
  );
}

/**
 * "¿Por dónde va?": él mismo toca en el dibujo de su ruta el pueblo por donde
 * va (Yohany, 22 de octubre de 2026; antes se marcaba con la ubicación del
 * teléfono y luego en una lista desplegable). Los que ya pasó quedan tachados,
 * pero se pueden tocar por si se equivocó. Si su pueblo no está, lo agrega con
 * "+ Paso por otro pueblo": va por otro lado, y su ruta pasa a ir por ahí.
 * Mientras no lo cambie, cuenta desde donde sale. Con "Cualquier destino" no
 * hay ruta: elige de todos los municipios. Los clientes no lo ven (Yohany, 21
 * de octubre de 2026): les deja de salir si su pueblo ya quedó atrás.
 */
function WhereYouAre({
  post,
  latestRef,
  onPatch,
}: {
  post: MyPost;
  /** El número de la última consulta de la tarjeta: una vieja no pisa por dónde va. */
  latestRef: React.RefObject<number>;
  onPatch: (patch: Partial<MyPost>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "+ Paso por otro pueblo" abre el campo para escribirlo.
  const [adding, setAdding] = useState(false);
  // El pueblo por donde ahora pasa su camino, si al agregarlo cambió la ruta:
  // así entiende por qué cambió el dibujo. Se quita al escoger otro.
  const [detour, setDetour] = useState<string | null>(null);
  const { id, editToken, origin } = post;
  const destination = post.destination ?? "";
  const route = post.route;
  const stops = useMemo(() => routeStops(origin, destination, route), [origin, destination, route]);
  const value = post.current ?? origin;

  const before = post.current ?? null;
  const change = useCallback(
    async (slug: string) => {
      if (!getCity(slug) || slug === value) return;
      onPatch({ current: slug });
      setBusy(true);
      setError(null);
      setDetour(null);
      setAdding(false);
      latestRef.current++;
      const res = await callServer(() => updateLocation({ id, editToken, city: slug }));
      latestRef.current++;
      setBusy(false);
      if (!res.ok) {
        onPatch({ current: before });
        setError(res.error);
        return;
      }
      // Si el pueblo no quedaba en su ruta, ahora la ruta pasa por ahí.
      onPatch({ route: res.route });
      if (res.route !== route) setDetour(getCity(slug)?.name ?? null);
    },
    [id, editToken, value, before, route, latestRef, onPatch],
  );

  const heading = (
    <div className="flex flex-col gap-1">
      <h2 className="card-title">¿Por dónde va?</h2>
      <p className="text-sm leading-snug text-muted">
        {stops.length === 0
          ? "Cámbielo cuando pase por otro pueblo. Así lo encuentran los clientes de ese camino."
          : "Toque el pueblo cuando pase. Así lo encuentran los clientes de ese camino."}
      </p>
    </div>
  );

  if (stops.length === 0) {
    return (
      <section className="card flex flex-col gap-3.5">
        {heading}
        <CitySelect name="where-you-are" label="¿Por dónde va?" value={value} onChange={(slug) => void change(slug)} />
        <ErrorNote message={error} />
      </section>
    );
  }

  // El dibujo de la ruta: un punto por pueblo, del origen al destino, unidos
  // por una línea, con el de ahora resaltado y los de antes tachados. Si el
  // suyo no está en la ruta (la ruta no pudo pasar por ahí), sale en su lugar
  // del camino.
  const here = getCity(value);
  const hereIndex = here ? stops.findIndex((s) => s.city.slug === here.slug) : -1;
  const offList = here && hereIndex === -1 ? here : null;
  let offAt = -1;
  if (offList) {
    const progress = routeProgress(origin, destination, offList.slug, route) ?? 0;
    const next = stops.findIndex((s) => s.t > progress);
    offAt = next === -1 ? stops.length : next;
  }
  const passedBefore = hereIndex !== -1 ? hereIndex : offAt;
  const last = stops.length - 1;

  return (
    <section className="card flex flex-col gap-3.5">
      {heading}
      {detour && <p className="text-sm font-semibold text-brand">Listo, su camino ahora pasa por {detour}.</p>}
      <ol aria-label="Su ruta" className="flex flex-col">
        {stops.map((stop, i) => (
          <Fragment key={stop.city.slug}>
            {i === offAt && offList && <HereRow name={offList.name} />}
            <li>
              <StopRow
                name={stop.city.name}
                end={i === 0 || i === last}
                here={i === hereIndex}
                passed={i < passedBefore}
                last={i === last && !(offAt === stops.length && offList)}
                busy={busy}
                onTap={() => void change(stop.city.slug)}
              />
            </li>
          </Fragment>
        ))}
        {offAt === stops.length && offList && <HereRow name={offList.name} last />}
      </ol>
      <ErrorNote message={error} />
      {adding ? (
        <div className="flex flex-col gap-2">
          <CitySelect
            name="other-town"
            label="Paso por otro pueblo"
            value=""
            exclude={origin}
            placeholder="Escriba el pueblo por donde va"
            onChange={(slug) => void change(slug)}
          />
          <p className="text-sm text-muted">Escríbalo o elíjalo. Su camino pasará por ahí.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md border border-dashed border-[#a3abb5] p-[13px] text-left text-[15px] text-muted"
        >
          + Paso por otro pueblo
        </button>
      )}
    </section>
  );
}

/**
 * Un pueblo del dibujo, que se puede tocar para marcarlo (Yohany, 22 de
 * octubre de 2026): un punto (más grande en el origen y el destino) unido al
 * siguiente por una línea. El de ahora va en Señal con "Usted va aquí"; los
 * que ya pasó quedan en gris y la línea recorrida en Señal, pero se pueden
 * tocar por si se equivocó.
 */
function StopRow({
  name,
  end,
  here,
  passed,
  last,
  busy,
  onTap,
}: {
  name: string;
  end: boolean;
  here: boolean;
  passed: boolean;
  last: boolean;
  busy: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy || here}
      onClick={onTap}
      className="grid w-full grid-cols-[28px_1fr] gap-x-3 text-left disabled:cursor-default"
    >
      <Dot end={end} here={here} passed={passed} last={last} traveled={passed} />
      <span
        className={`flex items-center gap-2.5 pt-1 text-[17px] ${last ? "" : "pb-4"} ${
          here || end ? "font-bold" : ""
        } ${passed && !here ? "text-[#7a8290]" : ""}`}
      >
        {name}
        {here && <HereTag />}
        {passed && !here && <span className="sr-only">(ya pasó)</span>}
      </span>
    </button>
  );
}

/** "Usted va aquí" cuando su pueblo no está en la ruta. */
function HereRow({ name, last = false }: { name: string; last?: boolean }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-3">
      <Dot end={false} here passed={false} last={last} traveled={false} />
      <span className={`flex items-center gap-2.5 pt-1 text-[17px] font-bold ${last ? "" : "pb-4"}`}>
        {name}
        <HereTag />
      </span>
    </li>
  );
}

/** El punto del pueblo y la línea hasta el siguiente: en Señal si ya la recorrió. */
function Dot({
  end,
  here,
  passed,
  last,
  traveled,
}: {
  end: boolean;
  here: boolean;
  passed: boolean;
  last: boolean;
  traveled: boolean;
}) {
  const fill = here ? "bg-brand" : passed ? "bg-[#a3abb5]" : last ? "bg-ink" : "bg-white";
  return (
    <span aria-hidden className="flex flex-col items-center">
      <span className={`mt-1.5 shrink-0 rounded-full border-2 border-ink ${end ? "size-[18px]" : "size-3"} ${fill}`} />
      {!last && <span className={`mt-1 min-h-4 w-0.5 flex-1 ${traveled ? "bg-brand" : "bg-[#c3c9d0]"}`} />}
    </span>
  );
}

function HereTag() {
  return <span className="rounded-[3px] bg-brand px-2 py-0.5 text-xs font-bold uppercase text-white">Usted va aquí</span>;
}

/**
 * El teléfono como se escribe en Colombia, "300 123 4567", con 10 números como
 * mucho. Si empieza con "+" es de otro país y queda como lo escribió.
 */
function phoneInput(raw: string): string {
  if (raw.trim().startsWith("+")) return raw;
  // Lo guardado de antes puede traer el 57 adelante.
  const digits = raw.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "").slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(" ");
}
