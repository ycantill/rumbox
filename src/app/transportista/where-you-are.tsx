"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { updateLocation } from "@/app/actions";
import { CitySelect, ErrorNote } from "@/components/ui";
import { getCity } from "@/lib/cities";
import { routeStops } from "@/lib/route";
import { routeDrawing } from "@/lib/route-drawing";
import { callServer } from "@/lib/server-call";
import type { MyPost } from "./types";

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
export function WhereYouAre({
  post,
  invalidate,
  onPatch,
}: {
  post: MyPost;
  /** Descarta las consultas en camino: una vieja no pisa por dónde va. */
  invalidate: () => void;
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
      invalidate();
      const res = await callServer(() => updateLocation({ id, editToken, city: slug }));
      invalidate();
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
    [id, editToken, value, before, route, invalidate, onPatch],
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
  const { hereIndex, offRoute, offRouteAt, passedBefore } = routeDrawing(stops, { origin, destination, route }, value);
  const last = stops.length - 1;

  return (
    <section className="card flex flex-col gap-3.5">
      {heading}
      {detour && <p className="text-sm font-semibold text-brand">Listo, su camino ahora pasa por {detour}.</p>}
      <ol aria-label="Su ruta" className="flex flex-col">
        {stops.map((stop, i) => (
          <Fragment key={stop.city.slug}>
            {i === offRouteAt && offRoute && <HereRow name={offRoute.name} />}
            <li>
              <StopRow
                name={stop.city.name}
                end={i === 0 || i === last}
                here={i === hereIndex}
                passed={i < passedBefore}
                last={i === last && !(offRouteAt === stops.length && offRoute)}
                busy={busy}
                onTap={() => void change(stop.city.slug)}
              />
            </li>
          </Fragment>
        ))}
        {offRouteAt === stops.length && offRoute && <HereRow name={offRoute.name} last />}
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
