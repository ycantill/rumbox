import { SERVICES, type Service } from "./domain";

/**
 * El mensaje que el cliente le manda al conductor por WhatsApp, ya escrito:
 * dice qué necesita, de dónde a dónde y para cuándo (si no es "Cualquier día").
 */
export function contactMessage(request: { service?: Service; from?: string; to?: string; when: string | null }): string {
  const service = request.service ? ` de ${SERVICES[request.service].label.toLowerCase()}` : "";
  const when = request.when ? ` para ${request.when}` : "";
  return `Hola, lo encontré en Rumbox. Necesito un servicio${service} de ${request.from} a ${request.to}${when}. ¿Me puede ayudar?`;
}
