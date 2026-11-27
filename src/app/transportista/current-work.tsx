"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { getMyAvailability, updateAvailability, updateServices } from "@/app/actions";
import { ConfirmSheet, ErrorNote, FieldError, SafetyTips, ServiceChecklist, SignalDot, useBogotaDates } from "@/components/ui";
import { getCity } from "@/lib/cities";
import { capitalize, whenText } from "@/lib/dates";
import { DRIVER_SPACES, SERVICES, destinationName, isKey, type Service } from "@/lib/domain";
import { isAppleMobile, mapsUrl } from "@/lib/maps";
import { DRIVER_TIPS } from "@/lib/safety";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { useServerSync } from "@/lib/use-server-sync";
import { NO_SERVICES_ERROR } from "@/lib/validate";
import { formatWhatsApp } from "@/lib/whatsapp";
import type { MyPost } from "./types";
import { WhereYouAre } from "./where-you-are";

/** "Usted está disponible": el viaje encendido, por dónde va y qué servicios hace ahora. */
export function CurrentWork({
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
  const { id, editToken } = post;

  // No se vence (Yohany, 21 de octubre de 2026): sigue hasta "Ya no estoy
  // disponible". Lo guardado de antes sin destino o con el espacio de un carro
  // particular (baúl o asientos) vuelve al formulario: tiene que elegir otra vez.
  // También si solo hacía encargos o diligencias, que salieron del MVP.
  const ended = !post.destination || !isKey(DRIVER_SPACES, post.space) || post.services?.length === 0;
  const endNow = useEffectEvent(() => onEnd());
  useEffect(() => {
    if (ended) endNow();
  }, [ended]);

  // Si sigue encendida y con qué servicios, desde el servidor: al abrir la
  // pantalla, al volver a la app y cada minuto mientras la tiene abierta. No ve
  // a los clientes: por su privacidad, ellos son los que lo llaman.
  const { invalidate } = useServerSync({
    key: `${id}:${editToken}`,
    enabled: !ended,
    fresh: justPublished,
    fetch: () => getMyAvailability({ id, editToken }),
    onResult: (res) => {
      if (!res.ok) {
        if (res.gone) onEnd();
        return;
      }
      if (res.status === "llena") {
        onEnd();
        return;
      }
      setError((e) => (e === NO_CONNECTION ? null : e));
      onPatch({ current: res.currentCity, route: res.route, services: res.services });
    },
    // Sin señal se queda lo guardado en el teléfono, con el aviso.
    onOffline: () => setError(NO_CONNECTION),
  });

  // Lo que no sirve no se alcanza a mostrar: con un espacio o una fecha que ya no
  // existen, la pantalla se rompía antes de volver al formulario.
  if (ended) return null;

  // "¿Qué servicios hace ahora?": solo le salen los clientes que piden uno de esos.
  async function changeServices(services: Service[]) {
    const before = post;
    setBusy(true);
    setError(null);
    invalidate();
    onChange({ ...post, services });
    const res = await callServer(() => updateServices({ id, editToken, services }));
    invalidate();
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
    invalidate();
    // Se apaga en el servidor para que ningún cliente lo vea, y se olvida en el teléfono.
    const res = await callServer(() => updateAvailability({ id, editToken, status: "llena" }));
    invalidate();
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

      <WhereYouAre post={post} invalidate={invalidate} onPatch={onPatch} />

      <ServicesNow services={post.services} busy={busy} onChange={changeServices} />

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
 * "¿Qué servicios hace ahora?" (Yohany, 28 de octubre de 2026): reemplazó a
 * "¿Cuánto espacio tiene ahora?". Si se llena, quita mudanzas y fletes, y le
 * siguen saliendo las encomiendas; si descarga en el camino, los vuelve a
 * marcar. Los de antes, sin servicios, hacen todos.
 */
function ServicesNow({
  services,
  busy,
  onChange,
}: {
  services: MyPost["services"];
  busy: boolean;
  onChange: (services: Service[]) => void;
}) {
  const value = services ?? (Object.keys(SERVICES) as Service[]);
  // Sin ninguno no le saldría nadie: para eso está "Ya no estoy disponible".
  const [empty, setEmpty] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line-soft bg-surface p-[18px]">
      <h2 className="card-title">¿Qué servicios hace ahora?</h2>
      <fieldset disabled={busy} className="flex flex-col gap-2.5">
        <legend className="sr-only">¿Qué servicios hace ahora?</legend>
        <ServiceChecklist
          value={value}
          onChange={(next) => {
            setEmpty(next.length === 0);
            if (next.length > 0) onChange(next);
          }}
        />
      </fieldset>
      <FieldError message={empty ? NO_SERVICES_ERROR : null} />
      <p className="text-sm leading-snug text-muted">Si se llena, quite mudanzas y fletes. Cuando descargue, vuelva a marcarlos.</p>
    </section>
  );
}
