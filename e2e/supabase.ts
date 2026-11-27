import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

/**
 * Datos del Supabase local (`npm run db:start`). Las llaves son las de
 * desarrollo que la CLI genera para el stack local: no sirven fuera de él.
 */
export function supabaseLocal(): { url: string; serviceRoleKey: string; anonKey: string } {
  let raw: string;
  try {
    raw = execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("El Supabase local no está corriendo. Arráncalo con: npm run db:start");
  }
  const s = JSON.parse(raw) as Record<string, string>;
  return { url: s.API_URL, serviceRoleKey: s.SERVICE_ROLE_KEY, anonKey: s.ANON_KEY };
}

/** Deja la base vacía para que cada corrida empiece igual (y sin límites por teléfono). */
export async function limpiarBase(): Promise<void> {
  const { url, serviceRoleKey } = supabaseLocal();
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  for (const tabla of ["requests", "availabilities", "events"]) {
    const { error } = await db.from(tabla).delete().not("id", "is", null);
    if (error) throw new Error(`No pude limpiar ${tabla}: ${error.message}`);
  }
}
