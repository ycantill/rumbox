"use client";

import Link from "next/link";
import { useState } from "react";
import { closeRequest, getLiveConfig, getMyRequest, type DriverMatch } from "@/app/actions";
import { ConfirmSheet, ErrorNote, SignalDot, useBogotaDates } from "@/components/ui";
import { getCity } from "@/lib/cities";
import { contactMessage } from "@/lib/contact-message";
import { capitalize, isStillValid, whenText } from "@/lib/dates";
import { ANY_DAY, ANY_DAY_LABEL, SERVICES } from "@/lib/domain";
import { listenForDrivers } from "@/lib/live";
import { NO_CONNECTION, callServer } from "@/lib/server-call";
import { useServerSync } from "@/lib/use-server-sync";
import { DriverCard } from "./driver-card";
import { StillSearching } from "./searching";
import type { MyRequest } from "./types";

/**
 * La solicitud abierta, con los transportistas que le sirven. Se ve al
 * solicitar y cada vez que vuelve a la pantalla, con la lista al día.
 */
export function MyRequestView({
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
  const { id, editToken, date } = request;

  // Transportistas que le sirven ahora, desde el servidor: al abrir la
  // pantalla, al volver a la app, cada minuto mientras la tiene abierta y
  // apenas un transportista se pone disponible o cambia la suya.
  const { invalidate } = useServerSync({
    key: `${id}:${editToken}:${date}`,
    fresh: initialMatches !== null,
    fetch: () => getMyRequest({ id, editToken }),
    onResult: (res) => {
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
    // Sin señal se queda lo guardado en el teléfono, con el aviso.
    onOffline: () => setError(NO_CONNECTION),
    subscribe: (refresh) => {
      let stopped = false;
      let unlisten = () => {};
      callServer(() => getLiveConfig()).then((config) => {
        if (stopped || !("live" in config)) return;
        // Un transportista le sirve desde su día en adelante: se escucha el canal
        // de todos los días, no solo el de la solicitud.
        if (config.live) unlisten = listenForDrivers(config.live, refresh);
      });
      return () => {
        stopped = true;
        unlisten();
      };
    },
  });

  async function end() {
    setBusy(true);
    setError(null);
    // Lo que traiga una consulta que salió antes ya no sirve.
    invalidate();
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
  const message = contactMessage({ service: request.service, from, to, when: anyDay ? null : whenOf(request.date) });

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
            <span className="text-[15px] font-semibold">{requestService(request)}</span>
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
        <StillSearching />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[30px] font-black uppercase leading-none">
              {matches.length === 1 ? "1 conductor va para allá" : `${matches.length} conductores van para allá`}
            </h2>
            <p className="text-[15px] text-muted">Llame o escriba y acuerden el precio.</p>
          </div>
          <div className="flex flex-col gap-3">
            {matches.map((m) => (
              <DriverCard
                key={m.id}
                match={m}
                destination={request.destination}
                to={to}
                leaves={m.service_date > today ? whenOf(m.service_date) : "hoy"}
                message={message}
              />
            ))}
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
