"use server";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { eventRow, type AnalyticsEvent } from "@/lib/analytics";
import { alertsFor, isPushEndpoint, type SubscriptionRow } from "@/lib/alerts";
import { isContactAnswer, phoneEnding, spaceLeft, type ContactAnswer } from "@/lib/contacts";
import {
  DRIVER_SPACES,
  isKey,
  type ClientLabor,
  type DriverLabor,
  type DriverSpace,
  type Volume,
} from "@/lib/domain";
import { matchesTrip, newestBy, type AvailabilityLike } from "@/lib/matching";
import { BUSY_AS_CLIENT_ERROR, BUSY_AS_DRIVER_ERROR } from "@/lib/one-at-a-time";
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
import { driverInputError, requestInputError } from "@/lib/validate";
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
  const invalid = driverInputError(input, todayInBogota());
  if (invalid || !whatsapp) return fail(invalid ?? "Revisa el número de teléfono.");

  const editToken = randomBytes(24).toString("base64url");
  const ipHash = hashIp(clientIp(await headers()));
  const row = {
    origin_city: input.origin,
    destination_city: input.destination,
    service_date: input.date,
    // Ya no hay jornadas. La columna no puede quedar vacía: "Todo el día".
    time_slot: "todo_el_dia",
    space: input.space,
    // Lo que podía llevar al empezar: con "Lo llevo" se resta y `space` guarda lo que queda.
    full_space: input.space,
    labor: input.labor,
    whatsapp,
    edit_token_hash: hashToken(editToken),
  };

  return withDb(DRIVER_DB_ERROR, async () => {
    // Sin límite, cualquiera podría poner transportistas falsos, con el número
    // de otra persona, que además les mandan avisos a los clientes.
    if (await tooMany("availabilities", whatsapp, ipHash)) return fail(DRIVER_RATE_LIMIT_ERROR);
    // Una cosa a la vez: un número con una solicitud abierta no se pone de transportista.
    if (await hasOpenRequest(whatsapp)) return fail(BUSY_AS_CLIENT_ERROR);

    const { data, error } = await db()
      .from("availabilities")
      .insert({ ...row, ip_hash: ipHash })
      .select("id")
      .single();
    if (error) throw error;
    // No se le muestran los clientes que esperan: por su privacidad, ellos lo
    // ven a él (Vía B) y son los que llaman o escriben. Solo ve, en "Te
    // encontraron", a los que tocan su tarjeta. A los que pidieron aviso les
    // llega uno al celular, después de responderle al transportista.
    after(() => alertClients(row as AvailabilityLike));
    return { ok: true as const, id: data.id as string, editToken };
  });
}

/**
 * "Ya no estoy disponible" (status llena). Una apagada no se vuelve a encender:
 * después se borra su teléfono.
 */
export async function updateAvailability(input: {
  id: string;
  editToken: string;
  status: "llena";
}): Promise<{ ok: true } | Fail> {
  if (input.status !== "llena") return fail("Algo salió mal. Intenta de nuevo.");
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
    const { error: upErr } = await db().from("availabilities").update({ status: "llena" }).eq("id", input.id);
    if (upErr) throw upErr;
    return { ok: true as const };
  });
}

/** Un cliente que tocó "Escribir por WhatsApp" o "Llamar" en su tarjeta. Nunca lleva el teléfono. */
export type DriverContact = {
  requestId: string;
  origin_city: string;
  destination_city: string;
  volume: Volume;
  labor: ClientLabor;
  /** Los dos últimos números del teléfono del cliente, para reconocerlo. */
  phoneEnd: string | null;
  answer: "lo_llevo" | null;
};

export type MyAvailabilityResult =
  | {
      ok: true;
      status: "activa" | "llena";
      /** Lo que le queda, después de restar lo que lleva. */
      space: DriverSpace;
      /** Lo que podía llevar al ponerse disponible. */
      fullSpace: DriverSpace;
      contacts: DriverContact[];
    }
  | (Fail & { gone?: true });

/**
 * El trabajo que el transportista tiene guardado en este teléfono, leído de la
 * base de datos, por si cambió o se apagó.
 */
export async function getMyAvailability(input: { id: string; editToken: string }): Promise<MyAvailabilityResult> {
  return withDb(DRIVER_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("availabilities")
      .select("origin_city, destination_city, service_date, space, full_space, labor, status, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return { ...fail("No encontramos tus datos en este teléfono."), gone: true as const };
    }
    // Vale hasta que termina el día del viaje: después se apagó sola. Las de antes, sin
    // destino o en carro particular (baúl o asientos), ya no les salen a los
    // clientes: también quedan apagadas.
    const active =
      data.status === "activa" &&
      Boolean(data.destination_city) &&
      isKey(DRIVER_SPACES, data.space) &&
      data.service_date >= todayInBogota();
    const status = active ? "activa" : "llena";
    const contacts = active ? await findContacts(input.id) : [];
    // Las de antes no guardaban lo que podía llevar al empezar.
    const fullSpace = isKey(DRIVER_SPACES, data.full_space) ? data.full_space : data.space;
    return { ok: true as const, status, space: data.space, fullSpace, contacts };
  });
}

/**
 * "Lo llevo" o "No lo llevo" de un cliente de "Te encontraron"; null lo deja
 * otra vez sin contestar. Después vuelve a calcular el espacio que le queda,
 * que es lo que miran los clientes, y lo devuelve.
 */
export async function answerContact(input: {
  id: string;
  editToken: string;
  requestId: string;
  answer: ContactAnswer | null;
}): Promise<{ ok: true; space: DriverSpace } | Fail> {
  if (input.answer !== null && !isContactAnswer(input.answer)) return fail("Algo salió mal. Intenta de nuevo.");
  return withDb(DRIVER_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("availabilities")
      .select("space, full_space, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return fail("No encontramos tus datos en este teléfono.");
    }
    const { error: upErr } = await db()
      .from("contacts")
      .update({ answer: input.answer })
      .eq("availability_id", input.id)
      .eq("request_id", input.requestId);
    if (upErr) throw upErr;

    // Lo que lleva, aunque el cliente ya haya cerrado la solicitud: igual ocupa espacio.
    const { data: taken, error: takenErr } = await db()
      .from("contacts")
      .select("request:requests!inner(volume)")
      .eq("availability_id", input.id)
      .eq("answer", "lo_llevo");
    if (takenErr) throw takenErr;
    const volumes = ((taken ?? []) as unknown as { request: { volume: Volume } }[]).map((t) => t.request.volume);
    // Las de antes no guardaban lo que podía llevar al empezar.
    const full: DriverSpace = isKey(DRIVER_SPACES, data.full_space) ? data.full_space : data.space;
    const space = spaceLeft(full, volumes);
    const patch: Record<string, string> = { space };
    if (!data.full_space) patch.full_space = full;
    const { error: spaceErr } = await db().from("availabilities").update(patch).eq("id", input.id);
    if (spaceErr) throw spaceErr;
    return { ok: true as const, space };
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
 * Una solicitud a la vez: si el cliente tocó "Cambiar mi solicitud", la nueva
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
  const invalid = requestInputError(input, todayInBogota());
  if (invalid || !whatsapp) return fail(invalid ?? "Revisa el número de teléfono.");

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
    // Una cosa a la vez: un número que está como transportista no pide uno.
    if (await hasActiveTrip(whatsapp)) return fail(BUSY_AS_DRIVER_ERROR);

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
    // Vale hasta que termina el día del viaje: después ya no les sale a los transportistas.
    const open = data.status === "abierta" && data.service_date >= todayInBogota();
    const matches = open ? await findDrivers(data) : [];
    return { ok: true as const, status: open ? "abierta" : "cerrada", matches };
  });
}

/** "Ya no necesito este servicio": la solicitud deja de salirles a los transportistas. */
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

/**
 * El cliente tocó "Escribir por WhatsApp" o "Llamar" en la tarjeta de un
 * transportista: él lo ve en "Te encontraron". Solo cuenta si la solicitud es
 * suya, sigue abierta y ese transportista de verdad le sirve, para que nadie
 * le llene la lista a otro. Si falla, no pasa nada: el cliente ya está
 * escribiendo o llamando.
 */
export async function recordContact(input: { id: string; editToken: string; availabilityId: string }): Promise<void> {
  try {
    const [{ data: r, error: rErr }, { data: a, error: aErr }] = await Promise.all([
      db()
        .from("requests")
        .select("origin_city, destination_city, service_date, volume, labor, status, edit_token_hash")
        .eq("id", input.id)
        .maybeSingle(),
      db()
        .from("availabilities")
        .select("origin_city, destination_city, service_date, space, labor, status")
        .eq("id", input.availabilityId)
        .maybeSingle(),
    ]);
    if (rErr) throw rErr;
    if (aErr) throw aErr;
    if (!r || !a || !tokenMatches(input.editToken, r.edit_token_hash)) return;
    if (r.status !== "abierta" || a.status !== "activa" || r.service_date < todayInBogota()) return;
    if (!a.destination_city || !isKey(DRIVER_SPACES, a.space) || !matchesTrip(a, r)) return;
    const { error } = await db()
      .from("contacts")
      .upsert(
        { availability_id: input.availabilityId, request_id: input.id },
        { onConflict: "availability_id,request_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  } catch (err) {
    console.error(err);
  }
}

// ------------------------------------------------------------------- Analíticas

/**
 * Cuenta una visita o un toque en "Escribir por WhatsApp" o "Llamar". No
 * guarda nada de la persona. Si falla, no pasa nada: nadie lo ve.
 */
export async function trackEvent(input: AnalyticsEvent): Promise<void> {
  const row = eventRow(input);
  if (!row) return;
  try {
    const { error } = await db().from("events").insert(row);
    if (error) throw error;
  } catch (err) {
    console.error(err);
  }
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

/** Si el número tiene una solicitud abierta que todavía vale. */
async function hasOpenRequest(whatsapp: string): Promise<boolean> {
  const { count, error } = await db()
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp", whatsapp)
    .eq("status", "abierta")
    .gte("service_date", todayInBogota());
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Si el número está como transportista en un viaje que todavía vale (lo mismo que ven los clientes). */
async function hasActiveTrip(whatsapp: string): Promise<boolean> {
  const { count, error } = await db()
    .from("availabilities")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp", whatsapp)
    .eq("status", "activa")
    .not("destination_city", "is", null)
    .in("space", Object.keys(DRIVER_SPACES))
    .gte("service_date", todayInBogota());
  if (error) throw error;
  return (count ?? 0) > 0;
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

/**
 * Los clientes que buscaron a este transportista. Los que contestó "No lo
 * llevo" ya no salen, ni los que no ha contestado y cerraron la solicitud
 * ("Ya no necesito este servicio") o la cambiaron. Los que lleva siguen
 * saliendo: ocupan espacio aunque el cliente ya haya cerrado la solicitud.
 */
async function findContacts(availabilityId: string): Promise<DriverContact[]> {
  const { data, error } = await db()
    .from("contacts")
    .select(
      "request_id, answer, request:requests!inner(origin_city, destination_city, volume, labor, status, service_date, whatsapp)",
    )
    .eq("availability_id", availabilityId)
    .or("answer.is.null,answer.eq.lo_llevo")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  type Row = {
    request_id: string;
    answer: "lo_llevo" | null;
    request: {
      origin_city: string;
      destination_city: string;
      volume: Volume;
      labor: ClientLabor;
      status: string;
      service_date: string;
      whatsapp: string | null;
    };
  };
  const today = todayInBogota();
  const rows = ((data ?? []) as unknown as Row[]).filter(
    (c) => c.answer === "lo_llevo" || (c.request.status === "abierta" && c.request.service_date >= today),
  );
  return rows.map((c) => ({
    requestId: c.request_id,
    origin_city: c.request.origin_city,
    destination_city: c.request.destination_city,
    volume: c.request.volume,
    labor: c.request.labor,
    // Solo los dos últimos números: el teléfono completo nunca sale del servidor.
    phoneEnd: phoneEnding(c.request.whatsapp),
    answer: c.answer,
  }));
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

function todayInBogota(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

