"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getMyAvailability, publishAvailability, updateAvailability } from "@/app/actions";
import {
  CitySelect,
  Choices,
  DayPicker,
  ErrorNote,
  Field,
  InfoNote,
  OriginCitySelect,
  PrivacyNote,
  useBogotaDates,
  useServiceDay,
} from "@/components/ui";
import { useActiveScreen } from "@/components/one-at-a-time";
import { getCity } from "@/lib/cities";
import { isStillValid, whenText } from "@/lib/dates";
import {
  DRIVER_LABOR,
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  SPACE_CAPACITY,
  destinationName,
  isKey,
  spaceInSentence,
  type DriverLabor,
  type DriverSpace,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { refreshWhileOpen } from "@/lib/refresh";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { driverInputError } from "@/lib/validate";
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
  // Lo que podía llevar antes de "Solo queda espacio para paquetes": con eso
  // vuelve el formulario, para el próximo viaje.
  fullSpace?: DriverSpace;
};

/** Por qué se apagó: si fue porque pasó el día, se le dice. */
type EndReason = "expired";

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
  // "Tu viaje anterior ya pasó", cuando vuelve el formulario porque se venció.
  const [notice, setNotice] = useState<string | null>(null);
  // Si se acaba de poner disponible: el título dice "¡Listo!".
  const [justPublished, setJustPublished] = useState(false);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Un trabajo a la vez: si ya hay uno, se muestra ese en vez del formulario.
  const current = posts[0];
  // Una cosa a la vez en el teléfono: si tiene una solicitud abierta, se va a esa pantalla.
  const screen = useActiveScreen();

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

  function endCurrent(reason?: EndReason) {
    // El formulario vuelve con los datos de antes, para ponerse otra vez con un toque.
    if (current) {
      setOrigin(current.origin);
      setDestination(current.destination ?? "");
      // Lo que podía llevar al empezar, no lo que le quedó libre al final del viaje.
      const space = current.fullSpace ?? current.space;
      // El baúl o los asientos de un carro particular ya no son una opción.
      if (isKey(DRIVER_SPACES, space)) setSpace(space);
    }
    setNotice(reason === "expired" ? "Tu viaje anterior ya pasó. Cuéntanos cuándo es el próximo." : null);
    setPosts([]);
    setJustPublished(false);
    save(KEYS.driverPosts, []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Lo que falta se dice aquí, con el tono de la app y aunque no haya señal.
    const input = { origin, destination, date, space, labor, whatsapp };
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
      setNotice(null);
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
        onEnd={endCurrent}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="-mt-4 text-sm text-muted">
        Cuéntanos hacia dónde vas y qué día viajas. No tienes que crear cuenta ni pagar comisiones.
      </p>
      <InfoNote message={notice} />
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

        {/* Es un viaje: vale hasta que termina ese día. */}
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
  onEnd,
}: {
  post: MyPost;
  /** El teléfono con que se puso disponible, para que vea si quedó bien. */
  phone: string | null;
  justPublished: boolean;
  onChange: (p: MyPost) => void;
  onEnd: (reason?: EndReason) => void;
}) {
  const { today, tomorrow } = useBogotaDates();
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un viaje vale hasta que termina su día. Si ya pasó, se apagó solo y vuelve el formulario
  // con sus datos; no hace falta preguntarle al servidor. Lo mismo con lo
  // guardado de antes sin destino o con el espacio de un carro particular
  // (baúl o asientos): ahora tiene que elegir otra vez.
  const expired = !isStillValid(post.date, today);
  const ended = !post.destination || expired || !isKey(DRIVER_SPACES, post.space);

  // Si sigue encendida y el espacio al día, desde el servidor: al abrir la
  // pantalla, al volver a la app y cada minuto mientras la tiene abierta. No
  // ve a los clientes: por su privacidad, ellos son los que lo llaman.
  const { id, editToken } = post;
  const fresh = justPublished;
  // Número de la última consulta: una respuesta vieja no pisa una más nueva ni
  // lo que acaba de cambiar con los botones.
  const latest = useRef(0);
  useEffect(() => {
    if (ended) {
      onEnd(expired ? "expired" : undefined);
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

  // Lo que no sirve no se alcanza a mostrar: con un espacio o una fecha que ya no
  // existen, la pantalla se rompía antes de volver al formulario.
  if (ended) return null;

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
    onChange({ ...post, space: "solo_paquetes", fullSpace: post.fullSpace ?? post.space });
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

    </div>
  );
}
