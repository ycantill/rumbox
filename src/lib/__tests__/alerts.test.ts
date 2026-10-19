import { describe, expect, it } from "vitest";
import { alertMessage, alertsFor, liveTopic, type SubscriptionRow } from "../alerts";
import type { AvailabilityLike } from "../matching";
import { urlBase64ToUint8Array } from "../push-client";

const driver: AvailabilityLike = {
  origin_city: "monteria",
  destination_city: "sincelejo",
  service_date: "2026-10-20",
  space: "camion_entero",
  labor: "con_ayudante",
};

function row(id: string, request: Partial<SubscriptionRow["request"]>): SubscriptionRow {
  return {
    id,
    endpoint: `https://push.example/${id}`,
    p256dh: "p",
    auth: "a",
    request: {
      id: `r-${id}`,
      origin_city: "monteria",
      destination_city: "sincelejo",
      service_date: "2026-10-20",
      volume: "carga_parcial",
      labor: "yo_cargo",
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
