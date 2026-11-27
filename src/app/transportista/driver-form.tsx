"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishAvailability } from "@/app/actions";
import { CitySelect, DayPicker, Field, FieldError, PrivacyNote, ServiceChecklist, useBogotaDates, useServiceDay } from "@/components/ui";
import { BackHome, useActiveScreen } from "@/components/one-at-a-time";
import { SAME_CITY_ERROR, UNSIZED_SPACE, type Service } from "@/lib/domain";
import { callServer } from "@/lib/server-call";
import { announce } from "@/lib/toast";
import { driverInputError } from "@/lib/validate";
import { normalizeWhatsApp, phoneInput } from "@/lib/whatsapp";
import { CurrentWork } from "./current-work";
import type { MyPost } from "./types";
import { useMyTrip } from "./use-my-trip";

export type { MyPost } from "./types";

/** "Voy de viaje": el formulario para ponerse disponible o, si ya lo está, su viaje. */
export function DriverForm() {
  const { today } = useBogotaDates();
  const trip = useMyTrip(today);
  const { current } = trip;
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = useServiceDay(pickedDate);
  const [services, setServices] = useState<Service[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Si se acaba de poner disponible: no hace falta consultar al servidor al abrir.
  const [justPublished, setJustPublished] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Una cosa a la vez en el teléfono: si tiene una solicitud abierta, se va a esa pantalla.
  const screen = useActiveScreen();
  const router = useRouter();

  // Precarga el número guardado en el teléfono.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhatsapp(phoneInput(trip.savedPhone));
  }, [trip.savedPhone]);

  function endCurrent(reason?: "closed") {
    setJustPublished(false);
    // Lo apagó él: vuelve al inicio con el aviso (Yohany, 27 de octubre de 2026).
    if (reason === "closed") {
      // La pantalla queda guardada al irse (Next la conserva): sin esto, al
      // volver saldría otra vez el viaje que apagó.
      trip.clear();
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
    }
    trip.clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const input = { origin, destination, date, services, whatsapp };
  // Lo que falta: el botón se ve apagado y, al tocarlo, se dice debajo.
  const invalid = today ? driverInputError(input, today) : null;

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
      trip.rememberPhone(whatsapp);
      const post: MyPost = {
        id: res.id,
        editToken: res.editToken,
        origin,
        destination,
        date,
        services,
        space: UNSIZED_SPACE,
        route: res.route,
      };
      trip.update(post);
      setJustPublished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!trip.loaded || (!current && screen === "/solicitar")) return null;

  if (current) {
    return (
      <CurrentWork
        key={current.id}
        post={current}
        phone={normalizeWhatsApp(whatsapp || trip.savedPhone)}
        justPublished={justPublished}
        onChange={trip.update}
        onPatch={trip.patch}
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
          <button type="submit" className={`btn-primary ${invalid ? "opacity-60" : ""}`} disabled={isPending}>
            {isPending ? "Un momento…" : "Ponerme disponible"}
          </button>
          <FieldError message={error} center />
        </div>
      </form>
    </div>
  );
}
