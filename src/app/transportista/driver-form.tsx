"use client";

import { useEffect, useState, useTransition } from "react";
import {
  publishAvailability,
  updateAvailability,
  type PendingRequest,
} from "@/app/actions";
import { CitySelect, Choices, ErrorNote, Field, WhatsAppButton, useBogotaDates } from "@/components/ui";
import { getCity, nearestCity } from "@/lib/cities";
import {
  DRIVER_LABOR,
  DRIVER_SPACES,
  TIME_SLOTS,
  VEHICLE_TYPES,
  VOLUMES,
  type DriverLabor,
  type DriverSpace,
  type TimeSlot,
  type VehicleType,
} from "@/lib/domain";
import { KEYS, load, save } from "@/lib/local-store";
import { formatCOP } from "@/lib/pricing";
import { waLink } from "@/lib/whatsapp";

type Profile = { vehicleType: VehicleType | ""; labor: DriverLabor | ""; whatsapp: string };

export type MyPost = {
  id: string;
  editToken: string;
  origin: string;
  destination: string | null;
  date: string;
  space: DriverSpace;
  status: "activa" | "llena";
};

export function DriverForm() {
  const { today, tomorrow } = useBogotaDates();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickedDate, setDate] = useState("");
  const date = pickedDate || today;
  const [timeSlot, setTimeSlot] = useState<TimeSlot | "">("todo_el_dia");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [space, setSpace] = useState<DriverSpace | "">("");
  const [labor, setLabor] = useState<DriverLabor | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRequest[] | null>(null);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [isPending, startTransition] = useTransition();

  // Precarga desde el teléfono: tipo de vehículo, mano de obra y WhatsApp.
  useEffect(() => {
    const p = load<Profile>(KEYS.driverProfile, { vehicleType: "", labor: "", whatsapp: "" });
    // localStorage solo existe en el navegador: se lee después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVehicleType(p.vehicleType);
    setLabor(p.labor);
    setWhatsapp(p.whatsapp);
    setPosts(load<MyPost[]>(KEYS.driverPosts, []).filter((x) => x.date >= today));
  }, [today]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin(nearestCity(pos.coords.latitude, pos.coords.longitude).slug);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await publishAvailability({
        origin,
        destination: destination || null,
        date,
        timeSlot,
        vehicleType,
        space,
        labor,
        whatsapp,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      save(KEYS.driverProfile, { vehicleType, labor, whatsapp } satisfies Profile);
      const post: MyPost = {
        id: res.id,
        editToken: res.editToken,
        origin,
        destination: destination || null,
        date,
        space: space as DriverSpace,
        status: "activa",
      };
      const next = [post, ...posts];
      setPosts(next);
      save(KEYS.driverPosts, next);
      setPending(res.pending);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (pending) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-brand-soft p-5">
          <h2 className="text-lg font-bold text-brand-ink">¡Listo! Ya estás publicado.</h2>
          <p className="mt-1 text-sm text-brand-ink/80">
            Los clientes que necesiten un servicio te escribirán por WhatsApp.
          </p>
        </div>
        <PendingList items={pending} />
        <MyPosts posts={posts} onChange={setPosts} />
        <button type="button" className="btn-secondary" onClick={() => setPending(null)}>
          Publicar otra disponibilidad
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <MyPosts posts={posts} onChange={setPosts} />
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="¿Dónde estás?">
          <div className="flex gap-2">
            <CitySelect name="origin" value={origin} onChange={setOrigin} />
            <button type="button" onClick={locate} className="btn-secondary shrink-0" disabled={locating}>
              {locating ? "…" : "Usar GPS"}
            </button>
          </div>
        </Field>

        {/* Con destino el match va por el corredor (Modo Ruta); sin destino, por
            cercanía al origen. Es lógica interna: el transportista no la ve. */}
        <Field label="¿Hacia dónde vas? (opcional)">
          <CitySelect
            name="destination"
            value={destination}
            onChange={setDestination}
            placeholder="Sin destino"
            allowEmpty
          />
        </Field>

        <Field label="¿Cuándo estás disponible?">
          <div className="grid grid-cols-3 gap-2">
            <QuickDate label="Hoy" value={today} current={date} onPick={setDate} />
            <QuickDate label="Mañana" value={tomorrow} current={date} onPick={setDate} />
            <input
              type="date"
              className="input"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Otra fecha"
            />
          </div>
          <Choices options={TIME_SLOTS} value={timeSlot} onChange={setTimeSlot} />
        </Field>

        <Field label="Tipo de vehículo">
          <Choices options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
        </Field>

        <Field label="Espacio disponible">
          <Choices options={DRIVER_SPACES} value={space} onChange={setSpace} />
        </Field>

        <Field label="Mano de obra">
          <Choices options={DRIVER_LABOR} value={labor} onChange={setLabor} columns={1} />
        </Field>

        <Field label="Tu WhatsApp" hint="Los clientes te escriben directo a este número.">
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

        <ErrorNote message={error} />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Publicando…" : "Publicar disponibilidad"}
        </button>
      </form>
    </div>
  );
}

function QuickDate({
  label,
  value,
  current,
  onPick,
}: {
  label: string;
  value: string;
  current: string;
  onPick: (v: string) => void;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onPick(value)}
      className={`rounded-xl border px-3 py-3 text-sm ${
        selected ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

function PendingList({ items }: { items: PendingRequest[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Por ahora no hay solicitudes esperando para esa fecha. Te mostraremos a los clientes que coticen.
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Solicitudes esperando transportista</h3>
      {items.map((r) => (
        <article key={r.id} className="card">
          <p className="font-semibold">
            {getCity(r.origin_city)?.name} → {getCity(r.destination_city)?.name}
          </p>
          <p className="text-sm text-muted">
            {VOLUMES[r.volume].label} · aprox. {formatCOP(r.estimated_price)}
          </p>
          <div className="mt-3">
            <WhatsAppButton
              href={waLink(
                r.whatsapp,
                `Hola, vi tu solicitud en Muvia de ${getCity(r.origin_city)?.name} a ${getCity(r.destination_city)?.name}. Tengo disponibilidad.`,
              )}
            >
              Escribir al cliente
            </WhatsAppButton>
          </div>
        </article>
      ))}
    </section>
  );
}

function MyPosts({ posts, onChange }: { posts: MyPost[]; onChange: (p: MyPost[]) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (posts.length === 0) return null;

  async function patch(post: MyPost, change: { status?: "activa" | "llena"; space?: DriverSpace }) {
    setBusy(post.id);
    setError(null);
    const res = await updateAvailability({ id: post.id, editToken: post.editToken, ...change });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const next = posts.map((p) => (p.id === post.id ? { ...p, ...change } : p));
    onChange(next);
    save(KEYS.driverPosts, next);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Mis publicaciones</h2>
      <ErrorNote message={error} />
      {posts.map((p) => (
        <article key={p.id} className="card flex flex-col gap-3">
          <div>
            <p className="font-semibold">
              {getCity(p.origin)?.name}
              {p.destination && ` → ${getCity(p.destination)?.name}`}
            </p>
            <p className="text-sm text-muted">
              {p.date} · {DRIVER_SPACES[p.space]} ·{" "}
              {p.status === "activa" ? "Recibiendo solicitudes" : "Ruta llena"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.status === "activa" ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy === p.id}
                onClick={() => patch(p, { status: "llena" })}
              >
                Ruta llena / Apagar
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy === p.id}
                onClick={() => patch(p, { status: "activa" })}
              >
                Volver a activar
              </button>
            )}
            {p.status === "activa" && p.space !== "solo_paquetes" && (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy === p.id}
                onClick={() => patch(p, { space: "solo_paquetes" })}
              >
                Solo queda espacio para paquetes
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
