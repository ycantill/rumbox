"use server";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getCity } from "@/lib/cities";
import {
  CLIENT_LABOR,
  DRIVER_LABOR,
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  TIME_SLOTS,
  VOLUMES,
  isKey,
  slotsLeftToday,
  type ClientLabor,
  type DriverLabor,
  type DriverSpace,
  type TimeSlot,
  type Volume,
} from "@/lib/domain";
import { matchesTrip, newestBy } from "@/lib/matching";
import { db } from "@/lib/supabase";
import { normalizeWhatsApp } from "@/lib/whatsapp";

type Fail = { ok: false; error: string };

export type DriverMatch = {
  id: string;
  origin_city: string;
  destination_city: string;
  time_slot: TimeSlot;
  space: DriverSpace;
  labor: DriverLabor;
  whatsapp: string;
};

export type PendingRequest = {
  id: string;
  origin_city: string;
  destination_city: string;
  service_date: string;
  volume: Volume;
  labor: ClientLabor;
  whatsapp: string;
};

// ---------------------------------------------------------------- Transportista

export type PublishResult =
  | { ok: true; id: string; editToken: string; pending: PendingRequest[] }
  | Fail;

export async function publishAvailability(input: {
  origin: string;
  destination: string;
  date: string;
  timeSlot: string;
  space: string;
  labor: string;
  whatsapp: string;
}): Promise<PublishResult> {
  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  if (!getCity(input.origin)) return fail("Elige la ciudad donde estás.");
  if (!getCity(input.destination)) return fail("Elige hacia dónde vas.");
  if (input.destination === input.origin) return fail(SAME_CITY_ERROR);
  if (!isValidServiceDate(input.date)) return fail("Elige un día de hoy en adelante.");
  if (!isKey(TIME_SLOTS, input.timeSlot)) return fail("Elige si trabajas en la mañana, la tarde o la noche.");
  if (input.date === todayInBogota() && !slotsLeftToday(hourInBogota()).includes(input.timeSlot)) {
    return fail("Esa jornada de hoy ya pasó. Elige otra.");
  }
  if (!isKey(DRIVER_SPACES, input.space)) return fail("Elige cuánto puedes llevar.");
  if (!isKey(DRIVER_LABOR, input.labor)) return fail("Elige si ayudas a cargar.");
  if (!whatsapp) return fail("Revisa el número de teléfono.");

  const editToken = randomBytes(24).toString("base64url");
  const row = {
    origin_city: input.origin,
    destination_city: input.destination,
    service_date: input.date,
    time_slot: input.timeSlot,
    space: input.space,
    labor: input.labor,
    whatsapp,
    edit_token_hash: hashToken(editToken),
  };

  return withDb(DRIVER_DB_ERROR, async () => {
    const { data, error } = await db().from("availabilities").insert(row).select("id").single();
    if (error) throw error;
    // Vía B (match diferido): solicitudes que estaban esperando un transportista.
    const pending = await findPendingRequests({ ...row, space: input.space as DriverSpace, labor: input.labor as DriverLabor });
    return { ok: true as const, id: data.id as string, editToken, pending };
  });
}

/** "Ya no voy a trabajar" (status llena), o actualizar el espacio que queda libre. */
export async function updateAvailability(input: {
  id: string;
  editToken: string;
  status?: "activa" | "llena";
  space?: string;
}): Promise<{ ok: true } | Fail> {
  if (input.space !== undefined && !isKey(DRIVER_SPACES, input.space)) return fail("Algo salió mal. Intenta de nuevo.");
  if (input.status !== undefined && input.status !== "activa" && input.status !== "llena") {
    return fail("Algo salió mal. Intenta de nuevo.");
  }
  return withDb(DRIVER_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("availabilities")
      .select("edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return fail("No encontramos tus datos en este teléfono.");
    }
    const patch: Record<string, string> = {};
    if (input.status) patch.status = input.status;
    if (input.space) patch.space = input.space;
    const { error: upErr } = await db().from("availabilities").update(patch).eq("id", input.id);
    if (upErr) throw upErr;
    return { ok: true as const };
  });
}

export type MyAvailabilityResult =
  | { ok: true; status: "activa" | "llena"; space: DriverSpace; pending: PendingRequest[] }
  | (Fail & { gone?: true });

/**
 * El trabajo que el transportista tiene guardado en este teléfono, leído de la
 * base de datos (por si cambió) junto con los clientes que lo están esperando.
 */
export async function getMyAvailability(input: { id: string; editToken: string }): Promise<MyAvailabilityResult> {
  return withDb(DRIVER_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("availabilities")
      .select("origin_city, destination_city, service_date, space, labor, status, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return { ...fail("No encontramos tus datos en este teléfono."), gone: true as const };
    }
    // Un viaje vale solo su día: si ya pasó, se apagó solo. Las de antes, sin
    // destino o en carro particular (baúl o asientos), ya no les salen a los
    // clientes: también quedan apagadas.
    const active =
      data.status === "activa" &&
      Boolean(data.destination_city) &&
      isKey(DRIVER_SPACES, data.space) &&
      data.service_date >= todayInBogota();
    const status = active ? "activa" : "llena";
    const pending = status === "activa" ? await findPendingRequests(data) : [];
    return { ok: true as const, status, space: data.space, pending };
  });
}

// ---------------------------------------------------------------------- Cliente

export type RequestResult =
  | { ok: true; id: string; matches: DriverMatch[] }
  | Fail;

/**
 * Guarda lo que el cliente necesita mover y le devuelve los transportistas que
 * le sirven. No se calcula precio: lo acuerdan al hablar.
 */
export async function createRequest(input: {
  origin: string;
  destination: string;
  date: string;
  volume: string;
  labor: string;
  whatsapp: string;
}): Promise<RequestResult> {
  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  if (!getCity(input.origin) || !getCity(input.destination)) return fail("Elige origen y destino.");
  if (input.destination === input.origin) return fail(SAME_CITY_ERROR);
  if (!isValidServiceDate(input.date)) return fail("Elige un día de hoy en adelante.");
  if (!isKey(VOLUMES, input.volume)) return fail("Elige qué vas a mover.");
  if (!isKey(CLIENT_LABOR, input.labor)) return fail("Elige si necesitas ayuda para cargar.");
  if (!whatsapp) return fail("Revisa el número de teléfono.");

  const request = {
    origin_city: input.origin,
    destination_city: input.destination,
    service_date: input.date,
    volume: input.volume,
    labor: input.labor,
  };

  return withDb(CLIENT_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("requests")
      .insert({ ...request, whatsapp })
      .select("id")
      .single();
    if (error) throw error;

    // Vía A (match inmediato): transportistas que viajan justo ese día. Las de
    // antes, sin destino o en carro particular (baúl o asientos), ya no salen.
    const { data: rows, error: qErr } = await db()
      .from("availabilities")
      .select("id, origin_city, destination_city, service_date, time_slot, space, labor, whatsapp")
      .eq("service_date", input.date)
      .not("destination_city", "is", null)
      .in("space", Object.keys(DRIVER_SPACES))
      .eq("status", "activa")
      .order("created_at", { ascending: false })
      .limit(500);
    if (qErr) throw qErr;

    const matches: DriverMatch[] = [];
    // Un mismo transportista puede estar dos veces (por ejemplo, si se puso
    // disponible desde dos navegadores): vale lo último que guardó.
    for (const a of newestBy(rows ?? [], (a) => a.whatsapp)) {
      if (matchesTrip(a, request as typeof request & { volume: Volume; labor: ClientLabor })) matches.push(a);
    }
    return { ok: true as const, id: data.id as string, matches: matches.slice(0, 20) };
  });
}

// ---------------------------------------------------------------------- Helpers

async function findPendingRequests(a: {
  origin_city: string;
  destination_city: string;
  service_date: string;
  space: DriverSpace;
  labor: DriverLabor;
}): Promise<PendingRequest[]> {
  // Solo los clientes del día del viaje.
  const { data, error } = await db()
    .from("requests")
    .select("id, origin_city, destination_city, service_date, volume, labor, whatsapp")
    .eq("status", "abierta")
    .eq("service_date", a.service_date)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const out: PendingRequest[] = [];
  // Si el cliente buscó varias veces para el mismo viaje, vale la última.
  const trips = newestBy(data ?? [], (r) => [r.whatsapp, r.origin_city, r.destination_city, r.service_date].join("|"));
  for (const r of trips) {
    if (matchesTrip(a, r)) out.push(r);
  }
  return out.slice(0, 20);
}

function fail(error: string): Fail {
  return { ok: false, error };
}

/** Lo que ve el cliente si falla la base de datos. */
const CLIENT_DB_ERROR = "No pudimos guardar tu solicitud. Intenta de nuevo en un momento.";
/** Lo que ve el transportista: él no hace solicitudes, y la palabra "disponible" no se repite. */
const DRIVER_DB_ERROR = "No pudimos guardar tus datos. Intenta de nuevo en un momento.";

async function withDb<T>(message: string, fn: () => Promise<T>): Promise<T | Fail> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    return fail(message);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token ?? ""), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Fecha YYYY-MM-DD entre hoy (hora Colombia) y 90 días adelante. */
function isValidServiceDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  const today = todayInBogota();
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 90);
  return date >= today && date <= max.toISOString().slice(0, 10);
}

function todayInBogota(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function hourInBogota(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(
      new Date(),
    ),
  );
}
