"use server";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getCity } from "@/lib/cities";
import {
  CLIENT_LABOR,
  DRIVER_LABOR,
  DRIVER_SPACES,
  TIME_SLOTS,
  VEHICLE_TYPES,
  VOLUMES,
  isKey,
  slotsLeftToday,
  spaceFitsVehicle,
  type ClientLabor,
  type DriverLabor,
  type DriverSpace,
  type TimeSlot,
  type VehicleType,
  type Volume,
} from "@/lib/domain";
import { matchKind, type MatchKind } from "@/lib/matching";
import { estimate, type Quote } from "@/lib/pricing";
import { db } from "@/lib/supabase";
import { normalizeWhatsApp } from "@/lib/whatsapp";

type Fail = { ok: false; error: string };

export type DriverMatch = {
  id: string;
  kind: MatchKind;
  origin_city: string;
  destination_city: string | null;
  time_slot: TimeSlot;
  vehicle_type: VehicleType;
  space: DriverSpace;
  labor: DriverLabor;
  whatsapp: string;
};

export type PendingRequest = {
  id: string;
  kind: MatchKind;
  origin_city: string;
  destination_city: string;
  volume: Volume;
  labor: ClientLabor;
  estimated_price: number;
  whatsapp: string;
};

// ---------------------------------------------------------------- Transportista

export type PublishResult =
  | { ok: true; id: string; editToken: string; pending: PendingRequest[] }
  | Fail;

export async function publishAvailability(input: {
  origin: string;
  destination: string | null;
  date: string;
  timeSlot: string;
  vehicleType: string;
  space: string;
  labor: string;
  whatsapp: string;
}): Promise<PublishResult> {
  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  const destination = input.destination || null;
  if (!getCity(input.origin)) return fail("Elige la ciudad donde estás.");
  if (destination && !getCity(destination)) return fail("El destino no es válido.");
  if (destination === input.origin) return fail("El destino debe ser distinto al origen.");
  if (!isValidServiceDate(input.date)) return fail("Elige un día de hoy en adelante.");
  if (!isKey(TIME_SLOTS, input.timeSlot)) return fail("Elige si trabajas en la mañana, la tarde o la noche.");
  if (input.date === todayInBogota() && !slotsLeftToday(hourInBogota()).includes(input.timeSlot)) {
    return fail("Esa jornada de hoy ya pasó. Elige otra.");
  }
  if (!isKey(VEHICLE_TYPES, input.vehicleType)) return fail("Elige qué vehículo tienes.");
  if (!isKey(DRIVER_SPACES, input.space) || !spaceFitsVehicle(input.vehicleType, input.space)) {
    return fail("Elige cuánto espacio tienes libre.");
  }
  if (!isKey(DRIVER_LABOR, input.labor)) return fail("Elige si ayudas a cargar.");
  if (!whatsapp) return fail("Revisa el número de WhatsApp.");

  const editToken = randomBytes(24).toString("base64url");
  const row = {
    origin_city: input.origin,
    destination_city: destination,
    service_date: input.date,
    time_slot: input.timeSlot,
    vehicle_type: input.vehicleType,
    space: input.space,
    labor: input.labor,
    whatsapp,
    edit_token_hash: hashToken(editToken),
  };

  return withDb(async () => {
    const { data, error } = await db().from("availabilities").insert(row).select("id").single();
    if (error) throw error;
    // Vía B (match diferido): solicitudes que estaban esperando un transportista.
    const pending = await findPendingRequests({ ...row, space: input.space as DriverSpace, labor: input.labor as DriverLabor });
    return { ok: true as const, id: data.id as string, editToken, pending };
  });
}

/** "Ruta llena / Apagar disponibilidad" o actualizar el espacio que queda libre. */
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
  return withDb(async () => {
    const { data, error } = await db()
      .from("availabilities")
      .select("edit_token_hash, vehicle_type")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return fail("No encontramos ese día en este teléfono.");
    }
    if (input.space && !spaceFitsVehicle(data.vehicle_type, input.space as DriverSpace)) {
      return fail("Algo salió mal. Intenta de nuevo.");
    }
    const patch: Record<string, string> = {};
    if (input.status) patch.status = input.status;
    if (input.space) patch.space = input.space;
    const { error: upErr } = await db().from("availabilities").update(patch).eq("id", input.id);
    if (upErr) throw upErr;
    return { ok: true as const };
  });
}

// ---------------------------------------------------------------------- Cliente

export type QuoteResult =
  | { ok: true; id: string; quote: Quote; matches: DriverMatch[] }
  | Fail;

export async function requestQuote(input: {
  origin: string;
  destination: string;
  date: string;
  volume: string;
  labor: string;
  stairsOrigin: number;
  stairsDestination: number;
  whatsapp: string;
}): Promise<QuoteResult> {
  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  if (!getCity(input.origin) || !getCity(input.destination)) return fail("Elige origen y destino.");
  if (!isValidServiceDate(input.date)) return fail("Elige un día de hoy en adelante.");
  if (!isKey(VOLUMES, input.volume)) return fail("Elige qué vas a mover.");
  if (!isKey(CLIENT_LABOR, input.labor)) return fail("Elige si necesitas ayuda para cargar.");
  if (!whatsapp) return fail("Revisa el número de WhatsApp.");

  const quote = estimate({
    origin: input.origin,
    destination: input.destination,
    volume: input.volume,
    labor: input.labor,
    stairsOrigin: Number(input.stairsOrigin) || 0,
    stairsDestination: Number(input.stairsDestination) || 0,
  });

  const request = {
    origin_city: input.origin,
    destination_city: input.destination,
    service_date: input.date,
    volume: input.volume,
    labor: input.labor,
  };

  return withDb(async () => {
    const { data, error } = await db()
      .from("requests")
      .insert({
        ...request,
        stairs_origin: Math.max(0, Math.min(30, Math.floor(Number(input.stairsOrigin) || 0))),
        stairs_destination: Math.max(0, Math.min(30, Math.floor(Number(input.stairsDestination) || 0))),
        whatsapp,
        estimated_price: quote.total,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Vía A (match inmediato).
    const { data: rows, error: qErr } = await db()
      .from("availabilities")
      .select("id, origin_city, destination_city, service_date, time_slot, vehicle_type, space, labor, whatsapp")
      .eq("service_date", input.date)
      .eq("status", "activa")
      .order("created_at", { ascending: false })
      .limit(500);
    if (qErr) throw qErr;

    const matches: DriverMatch[] = [];
    for (const a of rows ?? []) {
      const kind = matchKind(a, request as typeof request & { volume: Volume; labor: ClientLabor });
      if (kind) matches.push({ ...a, kind } as DriverMatch);
    }
    // Primero los que van en ruta: son más baratos para el cliente.
    matches.sort((x, y) => Number(y.kind === "ruta") - Number(x.kind === "ruta"));
    return { ok: true as const, id: data.id as string, quote, matches: matches.slice(0, 20) };
  });
}

// ---------------------------------------------------------------------- Helpers

async function findPendingRequests(a: {
  origin_city: string;
  destination_city: string | null;
  service_date: string;
  space: DriverSpace;
  labor: DriverLabor;
}): Promise<PendingRequest[]> {
  const { data, error } = await db()
    .from("requests")
    .select("id, origin_city, destination_city, service_date, volume, labor, estimated_price, whatsapp")
    .eq("service_date", a.service_date)
    .eq("status", "abierta")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const out: PendingRequest[] = [];
  for (const r of data ?? []) {
    const kind = matchKind(a, r);
    if (kind) out.push({ ...r, kind } as PendingRequest);
  }
  return out.slice(0, 20);
}

function fail(error: string): Fail {
  return { ok: false, error };
}

async function withDb<T>(fn: () => Promise<T>): Promise<T | Fail> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    return fail("No pudimos guardar tu solicitud. Intenta de nuevo en un momento.");
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
