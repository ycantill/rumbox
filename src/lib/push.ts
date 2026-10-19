import "server-only";
import webpush from "web-push";
import type { AlertMessage } from "./alerts";

let configured: boolean | null = null;

/**
 * Prepara el envío con las llaves VAPID. Sin ellas no se mandan avisos y el
 * resto de la app funciona igual.
 */
function ready(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = Boolean(publicKey && privateKey && subject);
  if (configured) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  return configured;
}

export function pushEnabled(): boolean {
  return ready();
}

/**
 * Manda un aviso a un teléfono. Devuelve "gone" si el teléfono ya no acepta
 * avisos (los desactivó o desinstaló la app): esa suscripción se borra.
 */
export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  message: AlertMessage,
): Promise<"ok" | "gone" | "error"> {
  if (!ready()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(message),
      // Un día: después la solicitud ya se venció.
      { TTL: 24 * 60 * 60, urgency: "high" },
    );
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error(err);
    return "error";
  }
}
