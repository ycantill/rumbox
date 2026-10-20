import { describe, expect, it } from "vitest";
import { alertMessage, alertsFor, isPushEndpoint, liveTopic, type SubscriptionRow } from "../alerts";
import type { AvailabilityLike } from "../matching";
import { urlBase64ToUint8Array } from "../push-client";

const driver: AvailabilityLike = {
  origin_city: "monteria",
  destination_city: "sincelejo",
  service_date: "2026-10-20",
  space: "camion_entero",
};

function row(id: string, request: Partial<SubscriptionRow["request"]>): SubscriptionRow {
  return {
    id,
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    p256dh: "p",
    auth: "a",
    request: {
      id: `r-${id}`,
      origin_city: "monteria",
      destination_city: "sincelejo",
      service_date: "2026-10-20",
      volume: "carga_parcial",
      ...request,
    },
  };
}

describe("alertsFor", () => {
  it("avisa solo a los clientes cuya solicitud le sirve al viaje", () => {
    const rows = [
      row("ruta", {}),
      row("otro-dia", { service_date: "2026-10-21" }),
      row("al-reves", { origin_city: "sincelejo", destination_city: "monteria" }),
    ];
    expect(alertsFor(driver, rows).map((a) => a.row.id)).toEqual(["ruta"]);
  });

  it("con cualquier destino avisa a los que salen de su municipio", () => {
    const anywhere = { ...driver, destination_city: "cualquiera" };
    const rows = [row("sale-de-ahi", { destination_city: "medellin" })];
    expect(alertsFor(anywhere, rows)).toHaveLength(1);
  });
});

describe("isPushEndpoint", () => {
  it("acepta los servicios de avisos de los navegadores", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isPushEndpoint("https://wns2-bl2p.notify.windows.com/w/?token=abc")).toBe(true);
  });

  it("rechaza cualquier otra página", () => {
    expect(isPushEndpoint("https://ejemplo.com/fcm.googleapis.com")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com.ejemplo.com/abc")).toBe(false);
    expect(isPushEndpoint("https://malofcm.googleapis.com/abc")).toBe(false);
    expect(isPushEndpoint("http://fcm.googleapis.com/abc")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com:8443/abc")).toBe(false);
    expect(isPushEndpoint("https://usuario@fcm.googleapis.com/abc")).toBe(false);
    expect(isPushEndpoint("no es una dirección")).toBe(false);
  });

  it("alertsFor no usa una suscripción con otra dirección", () => {
    const bad = { ...row("x", {}), endpoint: "https://ejemplo.com/x" };
    expect(alertsFor(driver, [bad])).toEqual([]);
  });
});

describe("alertMessage", () => {
  it("dice el viaje con los nombres de los municipios y lleva a la solicitud", () => {
    const m = alertMessage({ id: "abc", origin_city: "monteria", destination_city: "sincelejo" });
    expect(m.title).toBe("Apareció un transportista");
    expect(m.body).toContain("de Montería a Sincelejo");
    expect(m.url).toBe("/solicitar");
    expect(m.tag).toBe("solicitud-abc");
  });
});

describe("liveTopic", () => {
  it("es el mismo canal que arma la migración 0006", () => {
    expect(liveTopic("2026-10-20")).toBe("transportistas-2026-10-20");
  });
});

describe("urlBase64ToUint8Array", () => {
  it("convierte la llave pública sin relleno", () => {
    expect(Array.from(urlBase64ToUint8Array("AQID_-8"))).toEqual([1, 2, 3, 255, 239]);
  });
});
