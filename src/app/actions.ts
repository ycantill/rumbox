"use server";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { eventRow, type AnalyticsEvent } from "@/lib/analytics";
import { getCity } from "@/lib/cities";
import { roadRoute } from "@/lib/directions";
import {
  ANY_DAY,
  ANY_DESTINATION,
  DRIVER_SPACES,
  isKey,
  type DriverSpace,
  type Volume,
} from "@/lib/domain";
import { matchesTrip, newestBy } from "@/lib/matching";
import { BUSY_AS_CLIENT_ERROR, BUSY_AS_DRIVER_ERROR } from "@/lib/one-at-a-time";
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
  /** Desde qué día viaja: con "Cualquier día" el cliente lo ve si es después de hoy. */
  service_date: string;
  space: DriverSpace;
  whatsapp: string;
};

// ---------------------------------------------------------------- Transportista

export type PublishResult =
  | {
      ok: true;
      id: string;
      editToken: string;
      /** La carretera de su viaje (`encodePath`), o null si va por la línea recta. */
      route: string | null;
    }
  | Fail;

export async function publishAvailability(input: {
  origin: string;
  destination: string;
  date: string;
  space: string;
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
    // Lo que podía llevar al empezar: `space` es lo que le queda y él lo baja en su tarjeta.
    full_space: input.space,
    whatsapp,
    edit_token_hash: hashToken(editToken),
  };

  return withDb(DRIVER_DB_ERROR, async () => {
    // Sin límite, cualquiera podría poner transportistas falsos, con el número
    // de otra persona, que les salen a los clientes.
    if (await tooMany("availabilities", whatsapp, ipHash)) return fail(DRIVER_RATE_LIMIT_ERROR);
    // Una cosa a la vez: un número con una solicitud abierta no se pone de transportista.
    if (await hasOpenRequest(whatsapp)) return fail(BUSY_AS_CLIENT_ERROR);

    const route = await tripRoute(input.origin, input.destination);
    const { data, error } = await db()
      .from("availabilities")
      .insert({ ...row, route, ip_hash: ipHash })
      .select("id")
      .single();
    if (error) throw error;
    // No se le muestran los clientes: por su privacidad, ellos lo ven a él
    // (Vía B) y son los que llaman o escriben.
    return { ok: true as const, id: data.id as string, editToken, route };
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

export type MyAvailabilityResult =
  | {
      ok: true;
      status: "activa" | "llena";
      /** Lo que le queda: él mismo lo baja en su tarjeta. */
      space: DriverSpace;
      /** Lo que podía llevar al ponerse disponible. */
      fullSpace: DriverSpace;
      /** El municipio por donde va, si ya lo marcó. */
      currentCity: string | null;
      /** La carretera de su viaje, o null si va por la línea recta. */
      route: string | null;
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
      .select("origin_city, destination_city, service_date, space, full_space, current_city, route, status, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return { ...fail("No encontramos tus datos en este teléfono."), gone: true as const };
    }
    // No se vence (Yohany, 21 de octubre de 2026): sigue hasta "Ya no estoy
    // disponible". Las de antes, sin destino o en carro particular (baúl o
    // asientos), ya no les salen a los clientes: quedan apagadas.
    const active =
      data.status === "activa" && Boolean(data.destination_city) && isKey(DRIVER_SPACES, data.space);
    const status = active ? "activa" : "llena";
    return {
      ok: true as const,
      status,
      space: data.space,
      fullSpace: fullSpace(data),
      currentCity: getCity(data.current_city) ? (data.current_city as string) : null,
      route: (data.route as string | null) ?? null,
    };
  });
}

/**
 * "¿Por dónde vas?": el municipio más cercano a la ubicación del teléfono. El
 * teléfono lo calcula: las coordenadas no salen de ahí. Con eso no les sale a
 * los clientes que ya dejó atrás. Los clientes no lo ven (Yohany, 21 de
 * octubre de 2026).
 */
export async function updateLocation(input: {
  id: string;
  editToken: string;
  city: string;
}): Promise<{ ok: true } | Fail> {
  if (!getCity(input.city)) return fail("No pudimos saber dónde estás.");
  return withDb(DRIVER_DB_ERROR, async () => {
    const { data, error } = await db()
      .from("availabilities")
      .select("current_city, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return fail("No encontramos tus datos en este teléfono.");
    }
    // Si sigue en el mismo municipio no se guarda: así no se les avisa a las
    // pantallas de los clientes cada vez que se actualiza.
    if (data.current_city === input.city) return { ok: true as const };
    const { error: upErr } = await db()
      .from("availabilities")
      .update({ current_city: input.city })
      .eq("id", input.id);
    if (upErr) throw upErr;
    return { ok: true as const };
  });
}

/**
 * "¿Cuánto espacio te queda?": el transportista cambia lo que le queda, que es
 * lo que miran los clientes. Puede elegir cualquiera: si descarga en el camino,
 * puede quedar con más espacio del que tenía al empezar (Yohany, 21 de
 * octubre de 2026).
 */
export async function updateSpace(input: {
  id: string;
  editToken: string;
  space: string;
}): Promise<{ ok: true } | Fail> {
  if (!isKey(DRIVER_SPACES, input.space)) return fail("Elige cuánto espacio te queda.");
  const space = input.space;
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
    const patch: Record<string, string> = { space };
    // Las de antes no guardaban lo que podía llevar al empezar: con eso vuelve el formulario.
    if (!data.full_space) patch.full_space = fullSpace(data);
    const { error: upErr } = await db().from("availabilities").update(patch).eq("id", input.id);
    if (upErr) throw upErr;
    return { ok: true as const };
  });
}

// ---------------------------------------------------------------------- Cliente

export type RequestResult =
  | {
      ok: true;
      id: string;
      editToken: string;
      matches: DriverMatch[];
    }
  | Fail;

/**
 * Guarda lo que el cliente necesita mover y le devuelve los transportistas que
 * le sirven. No se calcula precio: lo acuerdan al hablar.
 *
 * Con "Cualquier día" le sirven los viajes de cualquier día y no se vence.
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
  whatsapp: string;
  replaces?: { id: string; editToken: string };
}): Promise<RequestResult> {
  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  const invalid = requestInputError(input, todayInBogota());
  if (invalid || !whatsapp) return fail(invalid ?? "Revisa el número de teléfono.");

  const request = {
    origin_city: input.origin,
    destination_city: input.destination,
    // "Cualquier día" queda sin día: no se vence y su teléfono no se borra
    // hasta que la cierre.
    service_date: input.date === ANY_DAY ? null : input.date,
    volume: input.volume as Volume,
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

    // Vía A (match inmediato): transportistas que ya viajan ese día, o cualquier día.
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
      .select("origin_city, destination_city, service_date, volume, status, edit_token_hash")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || !tokenMatches(input.editToken, data.edit_token_hash)) {
      return { ...fail("No encontramos tu solicitud en este teléfono."), gone: true as const };
    }
    // Vale hasta que termina el día del viaje: después ya no les sale a los
    // transportistas. La de "Cualquier día" no se vence.
    const open =
      data.status === "abierta" && (data.service_date === null || data.service_date >= todayInBogota());
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

export type LiveConfig = {
  /** Para escuchar el canal de Realtime; null si falta la configuración. */
  live: { url: string; anonKey: string } | null;
};

/**
 * Los datos públicos que necesita el navegador para Realtime. Se leen en el
 * servidor al momento, así que no hace falta el prefijo NEXT_PUBLIC_ ni
 * volver a construir la app al cambiarlos. Ninguno es secreto.
 */
export async function getLiveConfig(): Promise<LiveConfig> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return { live: url && anonKey ? { url, anonKey } : null };
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
    // La de "Cualquier día" no tiene día: vale hasta que la cierre.
    .or(`service_date.gte.${todayInBogota()},service_date.is.null`);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Si el número está como transportista y no se ha apagado (lo mismo que ven los clientes). */
async function hasActiveTrip(whatsapp: string): Promise<boolean> {
  const { count, error } = await db()
    .from("availabilities")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp", whatsapp)
    .eq("status", "activa")
    .not("destination_city", "is", null)
    .in("space", Object.keys(DRIVER_SPACES));
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
 * Los transportistas que le sirven: los que viajan desde el día de la
 * solicitud o antes y no se han apagado. Con "Cualquier día", todos.
 */
async function findDrivers(r: {
  origin_city: string;
  destination_city: string;
  service_date: string | null;
  volume: Volume;
}): Promise<DriverMatch[]> {
  const drivers = db()
    .from("availabilities")
    .select("id, origin_city, destination_city, service_date, space, current_city, route, whatsapp");
  const { data, error } = await (r.service_date === null ? drivers : drivers.lte("service_date", r.service_date))
    // Las de antes, sin destino o en carro particular (baúl o asientos), ya no salen.
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
    // Por dónde va no se le muestra al cliente (Yohany, 21 de octubre de 2026),
    // y la carretera solo sirve para el match.
    const { current_city, route, ...driver } = a;
    if (matchesTrip({ ...driver, current_city, route }, r)) matches.push(driver);
  }
  return matches.slice(0, 20);
}

/**
 * La carretera del viaje, para "¿Por dónde vas?" y el match. Si otro
 * transportista ya hizo el mismo viaje se usa la que quedó guardada; si no, se
 * le pide al servicio de rutas. Si no responde, null: va por la línea recta.
 */
async function tripRoute(origin: string, destination: string): Promise<string | null> {
  const from = getCity(origin);
  const to = getCity(destination);
  if (!from || !to || destination === ANY_DESTINATION) return null;
  const { data, error } = await db()
    .from("availabilities")
    .select("route")
    .eq("origin_city", origin)
    .eq("destination_city", destination)
    .not("route", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.route as string | undefined) ?? (await roadRoute(from, to));
}

/** Lo que podía llevar al ponerse disponible. Las de antes no lo guardaban. */
function fullSpace(a: { space: string; full_space: string | null }): DriverSpace {
  return (isKey(DRIVER_SPACES, a.full_space) ? a.full_space : a.space) as DriverSpace;
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

