"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createRequest, type DriverMatch } from "@/app/actions";
import { CitySelect, DayPicker, Field, FieldError, InfoNote, PrivacyNote, ServicePicker, useBogotaDates, useServiceDay } from "@/components/ui";
import { BackHome, useActiveScreen } from "@/components/one-at-a-time";
import { getCity } from "@/lib/cities";
import { isStillValid } from "@/lib/dates";
import { ANY_DAY, SAME_CITY_ERROR, SERVICES, isKey, type Service } from "@/lib/domain";
import { KEYS, forget, load, save } from "@/lib/local-store";
import { callServer } from "@/lib/server-call";
import { announce } from "@/lib/toast";
import { useBackStep } from "@/lib/use-back-step";
import { requestInputError } from "@/lib/validate";
import { MyRequestView } from "./my-request-view";
import { SearchingDrivers } from "./searching";
import type { MyRequest } from "./types";

export type { MyRequest } from "./types";

const EXPIRED_NOTICE = "Su solicitud anterior ya pasó. Si todavía necesita el servicio, haga una nueva.";

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
  // Una cosa a la vez en el teléfono: si está como transportista, se va a esa pantalla.
  const screen = useActiveScreen();
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  // "Cambiar" se deshace con la flecha de atrás del teléfono.
  const editStep = useBackStep(editing, stopEditing);

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
      editStep.done();
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

  function endRequest(reason?: "expired" | "closed") {
    save(KEYS.clientRequest, null);
    setCurrent(null);
    setMatches(null);
    // La cerró él: vuelve al inicio con el aviso (Yohany, 27 de octubre de 2026).
    if (reason === "closed") {
      // La pantalla queda guardada al irse (Next la conserva): sin limpiar lo de
      // arriba, al volver a pedir saldría otra vez la solicitud que cerró.
      setNotice(null);
      announce("Listo. Cerramos su solicitud.");
      router.push("/");
      return;
    }
    // Se cerró en el servidor o pasó el día: vuelve el formulario con sus datos.
    setNotice(reason === "expired" ? EXPIRED_NOTICE : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!loaded || (!current && screen === "/transportista")) return null;

  if (searching) return <SearchingDrivers from={getCity(origin)?.name} to={getCity(destination)?.name} />;

  if (current && !editing) {
    return (
      <MyRequestView
        key={current.id}
        request={current}
        matches={matches}
        onRestart={() => {
          // El formulario vuelve con los mismos datos, para cambiar solo lo que haga falta.
          editStep.open();
          setEditing(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onEnd={endRequest}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Si tocó "Cambiar" y se arrepiente, vuelve a su solicitud sin cambiarla,
          igual que con la flecha de atrás del teléfono. */}
      {current ? (
        <button type="button" onClick={editStep.back} className="self-start text-[15px] text-muted">
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
          <button type="submit" className={`btn-primary ${invalid ? "opacity-60" : ""}`} disabled={isPending}>
            Buscar conductor
          </button>
          <FieldError message={error} center />
        </div>
      </form>
    </div>
  );
}
