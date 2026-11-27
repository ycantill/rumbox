import { limpiarBase } from "./supabase";

export default async function globalSetup() {
  await limpiarBase();
}
