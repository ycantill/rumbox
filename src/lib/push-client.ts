// Avisos al celular desde el navegador: pedir permiso y suscribir el teléfono.
// En iPhone solo funcionan con Muvia agregada a la pantalla de inicio.

import type { AlertSubscription } from "@/app/actions";

/** Cómo están los avisos en este teléfono. */
export type AlertState =
  | "no" // el navegador no los permite, o la persona los bloqueó
  | "iphone" // iPhone sin agregar Muvia a la pantalla de inicio
  | "ask" // se le puede preguntar
  | "on"; // ya aceptó

export function alertState(): AlertState {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  // El service worker solo se registra en producción.
  if (!vapid || process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return "no";
  if (!("PushManager" in window) || !("Notification" in window)) {
    const standalone = (navigator as { standalone?: boolean }).standalone === true;
    return isIos() && !standalone ? "iphone" : "no";
  }
  if (Notification.permission === "denied") return "no";
  return Notification.permission === "granted" ? "on" : "ask";
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Pide permiso (si hace falta) y devuelve la suscripción del teléfono, o null
 * si la persona no aceptó.
 */
export async function getAlertSubscription(askPermission: boolean): Promise<AlertSubscription | null> {
  if (Notification.permission !== "granted") {
    if (!askPermission || (await Notification.requestPermission()) !== "granted") return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const sub =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
