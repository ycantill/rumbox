"use client";

// Una cosa a la vez en cada teléfono: si ya es transportista, en "Necesito mover
// algo" ve su viaje en vez del formulario, y al revés. Desde ahí lo
// apaga y le sale el formulario.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { closeRequest, getMyAvailability, getMyRequest, updateAvailability } from "@/app/actions";
import type { MyRequest } from "@/app/solicitar/client-form";
import type { MyPost } from "@/app/transportista/driver-form";
import { ErrorNote, useBogotaDates } from "@/components/ui";
import { getCity } from "@/lib/cities";
import { capitalize, whenText } from "@/lib/dates";
import { destinationName } from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { activeScreen } from "@/lib/one-at-a-time";
import { callServer } from "@/lib/server-call";

// Solo una vez por carga de la app: después, "← Inicio" sí deja ver el inicio.
let enteredApp = false;

/**
 * Al abrir Muvia en el inicio, si el teléfono tiene una solicitud o un viaje
 * abierto, va directo a esa pantalla.
 */
export function GoToActive() {
  const router = useRouter();
  const { today } = useBogotaDates();
  useEffect(() => {
    if (!today || enteredApp) return;
    enteredApp = true;
    // Solo si la app se abrió en el inicio, no si llegó con "← Inicio" desde otra pantalla.
    const opened = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (opened && new URL(opened.name).pathname !== "/") return;
    const screen = activeScreen(
      {
        request: load<MyRequest | null>(KEYS.clientRequest, null),
        trip: load<MyPost[]>(KEYS.driverPosts, [])[0],
      },
      today,
    );
    if (screen) router.replace(screen);
  }, [today, router]);
  return null;
}

/** En la pantalla del cliente: este teléfono está como transportista. */
export function ActiveTripNotice({ post, onCleared }: { post: MyPost; onCleared: () => void }) {
  const { today, tomorrow } = useBogotaDates();
  const { id, editToken } = post;

  function clear() {
    save(KEYS.driverPosts, []);
    onCleared();
  }

  // Si ya se apagó en el servidor (o desde otra pantalla), sale el formulario.
  // Sin señal se queda lo guardado en el teléfono.
  useEffect(() => {
    let cancelled = false;
    getMyAvailability({ id, editToken }).then(
      (res) => {
        if (cancelled) return;
        if ((!res.ok && res.gone) || (res.ok && res.status === "llena")) clear();
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editToken]);

  return (
    <BusyView
      title="Este teléfono está como transportista"
      route={`${getCity(post.origin)?.name} → ${destinationName(post.destination)}`}
      when={`Viajas ${whenText(post.date, today, tomorrow)}`}
      explain="En un mismo teléfono no puedes ser transportista y pedir uno a la vez. Para pedir un transportista, primero deja de trabajar."
      endLabel="Ya no voy a trabajar"
      confirm="¿Dejamos de mostrarte a los clientes?"
      viewHref="/transportista"
      viewLabel="Ver mi viaje"
      onEnd={async () => {
        const res = await callServer(() => updateAvailability({ id, editToken, status: "llena" }));
        if (!res.ok) return res.error;
        clear();
        return null;
      }}
    />
  );
}

/** En la pantalla del transportista: este teléfono tiene una solicitud abierta. */
export function OpenRequestNotice({ request, onCleared }: { request: MyRequest; onCleared: () => void }) {
  const { today, tomorrow } = useBogotaDates();
  const { id, editToken } = request;

  function clear() {
    save(KEYS.clientRequest, null);
    onCleared();
  }

  // Si ya se cerró en el servidor, sale el formulario. Sin señal se queda lo guardado.
  useEffect(() => {
    let cancelled = false;
    getMyRequest({ id, editToken }).then(
      (res) => {
        if (cancelled) return;
        if ((!res.ok && res.gone) || (res.ok && res.status === "cerrada")) clear();
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editToken]);

  return (
    <BusyView
      title="Tienes una solicitud abierta"
      route={`${getCity(request.origin)?.name} → ${getCity(request.destination)?.name}`}
      when={capitalize(whenText(request.date, today, tomorrow))}
      explain="En un mismo teléfono no puedes pedir un transportista y ser uno a la vez. Para trabajar como transportista, primero cierra tu solicitud."
      endLabel="Cerrar mi solicitud"
      confirm="¿Dejamos de mostrar tu solicitud a los transportistas?"
      viewHref="/solicitar"
      viewLabel="Ver mi solicitud"
      onEnd={async () => {
        const res = await callServer(() => closeRequest({ id, editToken }));
        // Si el servidor ya no la tiene, tampoco les sale a los transportistas.
        if (!res.ok && !("gone" in res && res.gone)) return res.error;
        clear();
        return null;
      }}
    />
  );
}

function BusyView({
  title,
  route,
  when,
  explain,
  endLabel,
  confirm,
  viewHref,
  viewLabel,
  onEnd,
}: {
  title: string;
  route: string;
  when: string;
  explain: string;
  endLabel: string;
  confirm: string;
  viewHref: string;
  viewLabel: string;
  /** Devuelve el error para mostrar, o null si quedó apagado. */
  onEnd: () => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function end() {
    setBusy(true);
    setError(null);
    const err = await onEnd();
    setBusy(false);
    setError(err);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-brand-soft p-5 text-brand-ink">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-3 font-semibold">{route}</p>
        <p className="text-sm">{when}</p>
        <p className="mt-4 text-sm text-brand-ink/80">{explain}</p>
      </section>

      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
        {confirmEnd ? (
          <div className="card flex flex-col gap-3">
            <p className="text-sm">{confirm}</p>
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
            {endLabel}
          </button>
        )}
        <Link href={viewHref} className="btn-secondary text-center">
          {viewLabel}
        </Link>
      </div>
    </div>
  );
}
