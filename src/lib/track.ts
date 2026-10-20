// Analíticas desde el navegador. Se mandan sin esperar respuesta: si no hay
// señal, el conteo se pierde y la persona no se entera.

import { trackEvent } from "@/app/actions";
import type { AnalyticsEvent } from "./analytics";
import { callServer } from "./server-call";

export function track(event: AnalyticsEvent): void {
  void callServer(() => trackEvent(event));
}
