"use server";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { alertsFor, isPushEndpoint, type SubscriptionRow } from "@/lib/alerts";
import { getCity } from "@/lib/cities";
import { addDays } from "@/lib/dates";
import {
  ANY_DESTINATION,
  CLIENT_LABOR,
  DRIVER_LABOR,
  DRIVER_SPACES,
  SAME_CITY_ERROR,
  VOLUMES,
  isKey,
  type ClientLabor,
  type DriverLabor,
  type DriverSpace,
  type Volume,
} from "@/lib/domain";
import { matchesTrip, newestBy, type AvailabilityLike } from "@/lib/matching";
import { pushEnabled, sendPush } from "@/lib/push";
import {
  DRIVER_RATE_LIMIT_ERROR,
  RATE_LIMIT_ERROR,
  RATE_WINDOW_MS,
  clientIp,
  overLimit,
  type LimitedTable,
} from "@/lib/rate-limit";
import { db } from "@/lib/supabase";
import { normalizeWhatsApp } from "@/lib/whatsapp";

type Fail = { ok: false; error: string };

export type DriverMatch = {
  id: string;
  origin_city: string;
  destination_city: string;
  space: DriverSpace;
  labor: DriverLabor;
  whatsapp: string;
};

// ---------------------------------------------------------------- Transportista

export type PublishResult =
  | { ok: true; id: string; editToken: string }
  | Fail;

export async function publishAvailability(input: {
  origin: string;
  destination: string;
  date: string;
  space: string;
  labor: string;
  whatsapp: string;
}): Promise<PublishResult> {
  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  if (!getCity(input.origin)) return fail("Elige la ciudad donde estás.");
  if (input.destination !== ANY_DESTINATION && !getCity(input.destination)) return fail("Elige hacia dónde vas.");
  if (input.destination === input.origin) return fail(SAME_CITY_ERROR);
  if (!isValidServiceDate(input.date)) return fail("Elige un día de hoy en adelante.");
  if (!isKey(DRIVER_SPACES, input.space)) return fail("Elige cuánto puedes llevar.");
  if (!isKey(DRIVER_LABOR, input.labor)) return fail("Elige si ayudas a cargar.");
  if (!whatsapp) return fail("Revisa el número de teléfono.");

  const editToken = randomBytes(24).toString("base64url");
  const ipHash = hashIp(clientIp(await headers()));
  const row = {
    origin_city: input.origin,
    destination_city: input.destination,
    service_date: input.date,
    // Ya no hay jornadas. La columna no puede quedar vacía: "Todo el día".
    time_slot: "todo_el_dia",
    space: input.space,
    labor: input.labor,
    whatsapp,
    edit_token_hash: hashToken(editToken),
  };

  return withDb(DRIVER_DB_ERROR, async () => {
    // Sin límite, cualquiera podría poner transportistas falsos, con el número
    // de otra persona, que además les mandan avisos a los clientes.
    if (await tooMany("availabilities", whatsapp, ipHash)) return fail(DRIVER_RATE_LIMIT_ERROR);

    const { data, error } = await db()
      .from("availabilities")
      .insert({ ...row, ip_hash: ipHash })
      .select("id")
      .single();
    if (error) throw error;
    // No se le muestran los clientes que esperan: por su privacidad, ellos lo
    // ven a él (Vía B) y son los que llaman o escriben. A los que pidieron
    // aviso les llega uno al celular, después de responderle al transportista.
    after(() => alertClients(row as AvailabilityLike));
    return { ok: true as const, id: data.id as string, editToken };
  });
}

/**
 * "Ya no voy a trabajar" (status llena), o actualizar el espacio que queda libre.
 * Una apagada no se vuelve a encender: después se borra su teléfono.
 */
export async function updateAvailability(input: {
  id: string;
  editToken: string;
  status?: "llena";
  space?: string;
}): Promise<{ ok: true } | Fail> {
  if (input.space !== undefined && !isKey(DRIVER_SPACES, input.space)) return fail("Algo salió mal. Intenta de nuevo.");
  if (input.status !== undefined && input.status !== "llena") {
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
  | { ok: true; status: "activa" | "llena"; space: DriverSpace }
  | (Fail & { gone?: true });

/**
 * El trabajo que el transportista tiene guardado en este teléfono, leído de la
 * base de datos, por si cambió o se apagó.
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
    // Vale el día del viaje y 24 horas más: después se apagó sola. Las de antes, sin
    // destino o en carro particular (baúl o asientos), ya no les salen a los
    // clientes: también quedan apagadas.
    const active =
      data.status === "activa" &&
      Boolean(data.destination_city) &&
      isKey(DRIVER_SPACES, data.space) &&
      data.service_date >= yesterdayInBogota();
    const status = active ? "activa" : "llena";
    return { ok: true as const, status, space: data.space };
  });
}

// ---------------------------------------------------------------------- Cliente

export type RequestResult =
  | { ok: true; id: string; editToken: string; matches: DriverMatch[] }
  | Fail;

/**
 * Guarda lo que el cliente necesita mover y le devuelve los transportistas que
 * le sirven. No se calcula precio: lo acuerdan al hablar.
 *
 * Una solicitud a la vez: si el cliente tocó "Hacer otra solicitud", la nueva
 * reemplaza la que tenía en el teléfono (`replaces`), y esa deja de salirles a
 * los transportistas.
 */
export async function createRequest(input: {
  origin: string;
  destination: string;
  date: string;
  volume: string;
  labor: string;
  whatsapp: string;
  replaces?: { id: string; editToken: string };
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
    volume: input.volume as Volume,
    labor: input.labor as ClientLabor,
  };

  const editToken = randomBytes(24).toString("base64url");
  const ipHash = hashIp(clientIp(await headers()));
  return withDb(CLIENT_DB_ERROR, async () => {
    // Muchas solicitudes seguidas sirven para juntar los teléfonos de los
    // transportistas: se frenan por teléfono y por conexión.
    if (await tooMany("requests", whatsapp, ipHash)) return fail(RATE_LIMIT_ERROR);

    const { data, error } = await db()
      .from("requests")
      .insert({ ...request, whatsapp, ip_hash: ipHash, edit_token_hash: hashToken(editToken) })
      .select("id")
      .single();
    if (error) throw error;

    if (input.replaces) {
      // La nueva ya quedó guardada: si cerrar la de antes falla, no se pierde.
      try {
        await closeOwnRequest(input.replaces);
      } catch (err) {
        console.error(err);
      }
    }

    // Vía A (match inmediato): transportistas que viajan justo ese día.
    const matches = await findDrivers(request);
    return { ok: true as const, id: data.id as string, editToken, matches };
  });
}

export type MyRequestResult =
  | { ok: true; status: "abierta" | "cerrada"; matches: DriverMatch[] }
  | (Fail & { gone?: true });

/**
 * La solicitud que el cliente tiene guardada en este teléfono, con los
 * transportistas que le sirven ahora. Así ve los que aparecieron después.
 */
export async function getMyRequest(input: { id: string; editToken: string }): Promise<MyRequestResult> {
  return withDb(CLIENT_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("requests")
      .select("origin_city, destination_city, service_date, volume, labor, status, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return { ...fail("No encontramos tu solicitud en este teléfono."), gone: true as const };
    }
    // Vale el día del viaje y 24 horas más: después ya no les sale a los transportistas.
    const open = data.status === "abierta" && data.service_date >= yesterdayInBogota();
    const matches = open ? await findDrivers(data) : [];
    return { ok: true as const, status: open ? "abierta" : "cerrada", matches };
  });
}

/** "Ya conseguí transportista": la solicitud deja de salirles a los transportistas. */
export async function closeRequest(input: {
  id: string;
  editToken: string;
}): Promise<{ ok: true } | (Fail & { gone?: true })> {
  return withDb("Algo salió mal. Intenta de nuevo en un momento.", async () => {
    if (!(await closeOwnRequest(input))) {
      return { ...fail("No encontramos tu solicitud en este teléfono."), gone: true as const };
    }
    return { ok: true as const };
  });
}

export type AlertsConfig = {
  /** Para escuchar el canal de Realtime; null si falta la configuración. */
  live: { url: string; anonKey: string } | null;
  /** Llave pública VAPID para suscribirse a los avisos; null si no hay avisos. */
  vapidPublicKey: string | null;
};

/**
 * Los datos públicos que necesita el navegador para Realtime y los avisos.
 * Se leen en el servidor al momento, así que no hace falta el prefijo
 * NEXT_PUBLIC_ ni volver a construir la app al cambiarlos. Ninguno es secreto.
 */
export async function getAlertsConfig(): Promise<AlertsConfig> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return {
    live: url && anonKey ? { url, anonKey } : null,
    vapidPublicKey: pushEnabled() ? process.env.VAPID_PUBLIC_KEY! : null,
  };
}

export type AlertSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

/**
 * "Avísame": guarda la suscripción del teléfono a los avisos, ligada a su
 * solicitud abierta. Si el teléfono ya la tenía con otra solicitud (por
 * ejemplo, al hacer otra), pasa a la nueva.
 */
export async function subscribeToAlerts(input: {
  id: string;
  editToken: string;
  subscription: AlertSubscription;
}): Promise<{ ok: true } | (Fail & { gone?: true })> {
  const sub = input.subscription;
  if (
    typeof sub?.endpoint !== "string" ||
    !isPushEndpoint(sub.endpoint) ||
    sub.endpoint.length > 1000 ||
    typeof sub.keys?.p256dh !== "string" ||
    typeof sub.keys?.auth !== "string" ||
    sub.keys.p256dh.length > 200 ||
    sub.keys.auth.length > 200
  ) {
    return fail("No pudimos activar el aviso en este celular.");
  }
  return withDb("No pudimos activar el aviso. Intenta de nuevo en un momento.", async () => {
    const { data, error } = await db().from("requests").select("edit_token_hash").eq("id", input.id).maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return { ...fail("No encontramos tu solicitud en este teléfono."), gone: true as const };
    }
    const { error: upErr } = await db()
      .from("push_subscriptions")
      .upsert(
        { request_id: input.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        { onConflict: "endpoint" },
      );
    if (upErr) throw upErr;
    return { ok: true as const };
  });
}

// ---------------------------------------------------------------------- Helpers

/**
 * Avisa al celular a los clientes con solicitud abierta ese día que le sirven
 * al transportista que se acaba de poner disponible. Corre después de
 * responderle: si falla, él no se entera y su disponibilidad ya quedó.
 */
async function alertClients(availability: AvailabilityLike): Promise<void> {
  if (!pushEnabled()) return;
  try {
    const { data, error } = await db()
      .from("push_subscriptions")
      .select(
        "id, endpoint, p256dh, auth, request:requests!inner(id, origin_city, destination_city, service_date, volume, labor, status)",
      )
      .eq("request.service_date", availability.service_date)
      .eq("request.status", "abierta")
      .limit(1000);
    if (error) throw error;
    const rows = (data ?? []) as unknown as SubscriptionRow[];
    const gone: string[] = [];
    await Promise.all(
      alertsFor(availability, rows).map(async ({ row, message }) => {
        if ((await sendPush(row, message)) === "gone") gone.push(row.id);
      }),
    );
    if (gone.length > 0) {
      const { error: delErr } = await db().from("push_subscriptions").delete().in("id", gone);
      if (delErr) throw delErr;
    }
  } catch (err) {
    console.error(err);
  }
}

/** Si el teléfono o la conexión ya guardaron demasiadas en la última hora. */
async function tooMany(table: LimitedTable, whatsapp: string, ipHash: string | null): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const count = async (column: "whatsapp" | "ip_hash", value: string | null) => {
    if (!value) return 0;
    const { count, error } = await db()
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, value)
      .gte("created_at", since);
    if (error) throw error;
    return count ?? 0;
  };
  const [phone, ip] = await Promise.all([count("whatsapp", whatsapp), count("ip_hash", ipHash)]);
  return overLimit(table, { phone, ip });
}

/**
 * Huella de la IP para contar lo guardado sin guardar la IP. Lleva la service
 * role key como llave secreta para que no se pueda adivinar la IP probando.
 */
function hashIp(ip: string | null): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ip || !secret) return null;
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/** Cierra la solicitud si el token es el suyo. Devuelve si la encontró. */
async function closeOwnRequest(input: { id: string; editToken: string }): Promise<boolean> {
  const { data, error } = await db().from("requests").select("edit_token_hash").eq("id", input.id).maybeSingle();
  if (error) throw error;
  if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) return false;
  const { error: upErr } = await db().from("requests").update({ status: "cerrada" }).eq("id", input.id);
  if (upErr) throw upErr;
  return true;
}

/** Los transportistas que viajan el día de la solicitud y le sirven. */
async function findDrivers(r: {
  origin_city: string;
  destination_city: string;
  service_date: string;
  volume: Volume;
  labor: ClientLabor;
}): Promise<DriverMatch[]> {
  // Las de antes, sin destino o en carro particular (baúl o asientos), ya no salen.
  const { data, error } = await db()
    .from("availabilities")
    .select("id, origin_city, destination_city, service_date, space, labor, whatsapp")
    .eq("service_date", r.service_date)
    .not("destination_city", "is", null)
    .in("space", Object.keys(DRIVER_SPACES))
    .eq("status", "activa")
    // Sin teléfono no sirve: ya se borró porque dejó de valer.
    .not("whatsapp", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const matches: DriverMatch[] = [];
  // Un mismo transportista puede estar dos veces (por ejemplo, si se puso
  // disponible desde dos navegadores): vale lo último que guardó.
  for (const a of newestBy(data ?? [], (a) => a.whatsapp)) {
    if (matchesTrip(a, r)) matches.push(a);
  }
  return matches.slice(0, 20);
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

/** Las solicitudes de antes no tienen token (`hash` vacío): no las controla nadie. */
function tokenMatches(token: string, hash: string | null): boolean {
  if (!hash) return false;
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

/** Ayer en hora Colombia: lo de ayer todavía está dentro de sus 24 horas. */
function yesterdayInBogota(): string {
  return addDays(todayInBogota(), -1);
}
