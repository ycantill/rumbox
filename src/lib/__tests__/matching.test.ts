import { describe, expect, it } from "vitest";
import { ANY_DESTINATION } from "../domain";
import { matchesTrip, newestBy, type AvailabilityLike, type RequestLike } from "../matching";
import { BOGOTA_BARRANQUILLA_ROUTE } from "./road-fixture";

const date = "2026-11-01";

// Un transportista que va de Montería a Cartagena.
const driver = (o: Partial<AvailabilityLike> = {}): AvailabilityLike => ({
  origin_city: "monteria",
  destination_city: "cartagena",
  service_date: date,
  space: "camion_entero",
  ...o,
});

// Un cliente que va de Montería a Sincelejo, que queda de camino a Cartagena.
const request = (o: Partial<RequestLike> = {}): RequestLike => ({
  origin_city: "monteria",
  destination_city: "sincelejo",
  service_date: date,
  volume: "medio_camion",
  ...o,
});

describe("servicios", () => {
  it("solo le salen los clientes que piden uno de los servicios que hace", () => {
    const fletes = driver({ services: ["flete", "encomienda"] });
    expect(matchesTrip(fletes, request({ service: "flete" }))).toBe(true);
    expect(matchesTrip(fletes, request({ service: "encomienda", volume: "sobres" }))).toBe(true);
    expect(matchesTrip(fletes, request({ service: "mudanza" }))).toBe(false);
    expect(matchesTrip(driver({ services: ["mudanza"], destination_city: ANY_DESTINATION }), request({ service: "diligencia", volume: "sobres" }))).toBe(false);
  });

  it("lo guardado antes de los servicios: el transportista hace todos y la solicitud le sirve a cualquiera", () => {
    expect(matchesTrip(driver({ services: null }), request({ service: "diligencia", volume: "sobres" }))).toBe(true);
    expect(matchesTrip(driver({ services: ["diligencia"] }), request({ service: null }))).toBe(true);
  });

  it("el servicio no salta las otras reglas: el tamaño y la ruta siguen contando", () => {
    expect(matchesTrip(driver({ services: ["mudanza"], space: "carga_parcial" }), request({ service: "mudanza" }))).toBe(false);
    expect(matchesTrip(driver({ services: ["mudanza"] }), request({ service: "mudanza", destination_city: "medellin" }))).toBe(false);
  });
});

describe("matchesTrip", () => {
  it("atiende cargas sobre el corredor y en el mismo sentido", () => {
    expect(matchesTrip(driver(), request())).toBe(true);
    expect(matchesTrip(driver(), request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe(true);
    // Sentido contrario.
    expect(matchesTrip(driver(), request({ origin_city: "cartagena", destination_city: "monteria" }))).toBe(false);
    // Fuera del corredor.
    expect(matchesTrip(driver(), request({ destination_city: "medellin" }))).toBe(false);
  });

  it("no atiende servicios dentro del mismo municipio, aunque quede en el corredor", () => {
    // Las solicitudes nuevas ya no lo permiten; estas quedaron guardadas de antes.
    expect(matchesTrip(driver(), request({ destination_city: "monteria" }))).toBe(false);
    expect(matchesTrip(driver(), request({ origin_city: "sincelejo", destination_city: "sincelejo" }))).toBe(false);
  });

  it("ya no atiende por cercanía: estar cerca del origen no basta si no va para allá", () => {
    // Cereté queda al lado de Montería, pero Medellín no está de camino a Cartagena.
    expect(matchesTrip(driver(), request({ origin_city: "cerete", destination_city: "medellin" }))).toBe(false);
  });

  it("viaja desde su día en adelante: no se vence", () => {
    expect(matchesTrip(driver(), request({ service_date: "2026-11-02" }))).toBe(true);
    expect(matchesTrip(driver(), request({ service_date: "2027-01-15" }))).toBe(true);
    // Antes de su día todavía no va para allá.
    expect(matchesTrip(driver(), request({ service_date: "2026-10-31" }))).toBe(false);
  });

  it("con \"Cualquier día\" le sirve el viaje de cualquier día", () => {
    const anyDay = request({ service_date: null });
    expect(matchesTrip(driver(), anyDay)).toBe(true);
    expect(matchesTrip(driver({ service_date: "2027-01-15" }), anyDay)).toBe(true);
    // Lo demás se sigue mirando igual.
    expect(matchesTrip(driver(), request({ service_date: null, origin_city: "cartagena", destination_city: "monteria" }))).toBe(false);
    expect(matchesTrip(driver({ space: "solo_paquetes" }), anyDay)).toBe(false);
  });

  it("respeta cuánto puede llevar", () => {
    expect(matchesTrip(driver({ space: "solo_paquetes" }), request())).toBe(false);
    expect(matchesTrip(driver({ space: "solo_paquetes" }), request({ volume: "sobres" }))).toBe(true);
    expect(matchesTrip(driver({ space: "carga_parcial" }), request({ volume: "carga_parcial" }))).toBe(true);
    expect(matchesTrip(driver({ space: "carga_parcial" }), request())).toBe(false);
    expect(matchesTrip(driver({ space: "medio_camion" }), request({ volume: "camion_entero" }))).toBe(false);
  });

  it("con cualquier destino atiende a los que salen de su municipio o de uno cercano, vayan a donde vayan", () => {
    const anywhere = driver({ destination_city: ANY_DESTINATION });
    expect(matchesTrip(anywhere, request())).toBe(true);
    expect(matchesTrip(anywhere, request({ destination_city: "medellin" }))).toBe(true);
    // Cereté queda al lado de Montería.
    expect(matchesTrip(anywhere, request({ origin_city: "cerete", destination_city: "medellin" }))).toBe(true);
    // Sincelejo ya queda lejos, aunque vaya para el mismo lado.
    expect(matchesTrip(anywhere, request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe(false);
    // Lo demás se sigue respetando: el día, la carga y el mismo municipio.
    expect(matchesTrip(anywhere, request({ service_date: "2026-10-31" }))).toBe(false);
    expect(matchesTrip(driver({ destination_city: ANY_DESTINATION, space: "solo_paquetes" }), request())).toBe(false);
    expect(matchesTrip(anywhere, request({ destination_city: "monteria" }))).toBe(false);
  });

  it("si marcó por dónde va, no le salen los clientes que dejó atrás", () => {
    // Ya va por Tolú, camino a Cartagena.
    const onTheWay = driver({ current_city: "tolu" });
    expect(matchesTrip(onTheWay, request({ origin_city: "tolu", destination_city: "cartagena" }))).toBe(true);
    expect(matchesTrip(onTheWay, request({ origin_city: "san-onofre", destination_city: "turbaco" }))).toBe(true);
    // Montería y Cereté ya quedaron atrás.
    expect(matchesTrip(onTheWay, request())).toBe(false);
    expect(matchesTrip(onTheWay, request({ destination_city: "cartagena" }))).toBe(false);
    expect(matchesTrip(onTheWay, request({ origin_city: "cerete", destination_city: "cartagena" }))).toBe(false);
    // Sincelejo quedó unos pocos km atrás: todavía le sirve.
    expect(matchesTrip(onTheWay, request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe(true);
    // Sin marcar, o todavía en el origen, todo sigue igual.
    expect(matchesTrip(driver({ current_city: null }), request())).toBe(true);
    expect(matchesTrip(driver({ current_city: "monteria" }), request())).toBe(true);
  });

  it("con cualquier destino y marcado por dónde va, atiende a los que salen de cerca de ahí", () => {
    const anywhere = driver({ destination_city: ANY_DESTINATION, current_city: "sincelejo" });
    expect(matchesTrip(anywhere, request({ origin_city: "sincelejo", destination_city: "cartagena" }))).toBe(true);
    expect(matchesTrip(anywhere, request({ origin_city: "corozal", destination_city: "medellin" }))).toBe(true);
    // Montería ya le queda lejos.
    expect(matchesTrip(anywhere, request())).toBe(false);
  });
});

// Cada situación del match con municipios reales: el transportista, el cliente
// y si le debe salir. Lo que no se dice queda como en `driver()` y `request()`.
type Case = [string, Partial<AvailabilityLike>, Partial<RequestLike>, boolean];
const trip = (origin_city: string, destination_city: string) => ({ origin_city, destination_city });

describe("casos con municipios reales", () => {
  const route: Case[] = [
    ["sale de donde sale él y queda de camino", {}, {}, true],
    ["sale de un pueblo vecino de su origen", {}, trip("cerete", "cartagena"), true],
    ["recoge y entrega a mitad de camino", {}, trip("sincelejo", "turbaco"), true],
    ["un tramo corto en el camino", {}, trip("lorica", "san-antero"), true],
    ["va en sentido contrario", {}, trip("cartagena", "monteria"), false],
    ["va en sentido contrario, a mitad de camino", {}, trip("sincelejo", "monteria"), false],
    ["va para otro lado", {}, trip("monteria", "medellin"), false],
    ["sale de un pueblo que queda detrás de su origen", {}, trip("planeta-rica", "cartagena"), false],
    ["sigue después de su destino", {}, trip("cartagena", "barranquilla"), false],
    ["Bogotá → Medellín: de Honda a Rionegro", trip("bogota", "medellin"), trip("honda", "rionegro-antioquia"), true],
    ["Bogotá → Medellín: de Envigado a Bello, ya llegando", trip("bogota", "medellin"), trip("envigado", "bello"), true],
    ["Bogotá → Medellín: de Bello a Medellín, devolviéndose", trip("bogota", "medellin"), trip("bello", "medellin"), false],
    ["Bogotá → Barranquilla: de Soacha, pegado a su origen", trip("bogota", "barranquilla"), trip("soacha", "barranquilla"), true],
    ["Bogotá → Barranquilla: de Ciénaga a Barranquilla, llegando", trip("bogota", "barranquilla"), trip("cienaga", "barranquilla"), true],
    ["Bogotá → Barranquilla: de Barranquilla a Ciénaga, devolviéndose", trip("bogota", "barranquilla"), trip("barranquilla", "cienaga"), false],
    ["Bogotá → Barranquilla: de Girardot a Fusagasugá, detrás de su origen", trip("bogota", "barranquilla"), trip("girardot", "fusagasuga"), false],
    ["Bogotá → Barranquilla: de Villavicencio, detrás de su origen", trip("bogota", "barranquilla"), trip("villavicencio", "barranquilla"), false],
    ["Cali → Pasto: de Popayán a Pasto", trip("cali", "pasto"), trip("popayan", "pasto"), true],
    ["Cali → Pasto: de Pasto a Popayán", trip("cali", "pasto"), trip("pasto", "popayan"), false],
    ["viaje corto Montería → Cereté: a San Pelayo, al lado de Cereté", trip("monteria", "cerete"), trip("monteria", "san-pelayo"), true],
    ["viaje corto Montería → Cereté: a Sincelejo, mucho más allá", trip("monteria", "cerete"), trip("monteria", "sincelejo"), false],
    ["origen y destino en el mismo municipio", {}, trip("sincelejo", "sincelejo"), false],
    ["un municipio que no existe", {}, trip("monteria", "no-existe"), false],
  ];

  const anywhere = { destination_city: ANY_DESTINATION };
  const anyDestination: Case[] = [
    ["cualquier destino: sale de su municipio", anywhere, trip("monteria", "bogota"), true],
    ["cualquier destino: sale de un pueblo vecino", anywhere, trip("cerete", "medellin"), true],
    ["cualquier destino: sale de un pueblo lejos", anywhere, trip("sincelejo", "cartagena"), false],
    ["cualquier destino: va por Sincelejo y el cliente sale de Corozal", { ...anywhere, current_city: "sincelejo" }, trip("corozal", "medellin"), true],
    ["cualquier destino: va por Sincelejo y el cliente sale de Montería", { ...anywhere, current_city: "sincelejo" }, {}, false],
  ];

  const whereNow: Case[] = [
    ["va por Tolú: el cliente de Montería quedó atrás", { current_city: "tolu" }, {}, false],
    ["va por Tolú: sale de Tolú", { current_city: "tolu" }, trip("tolu", "cartagena"), true],
    ["va por Tolú: sale de San Onofre, más adelante", { current_city: "tolu" }, trip("san-onofre", "turbaco"), true],
    ["va por Tolú: Sincelejo quedó a pocos km", { current_city: "tolu" }, trip("sincelejo", "cartagena"), true],
    ["marcó que sigue en Montería", { current_city: "monteria" }, {}, true],
  ];

  const dates: Case[] = [
    ["el cliente quiere cualquier día", {}, { service_date: null }, true],
    ["el cliente quiere cualquier día y él viaja en enero", { service_date: "2027-01-15" }, { service_date: null }, true],
    ["el mismo día", {}, { service_date: date }, true],
    ["el cliente quiere un día después del suyo", {}, { service_date: "2026-11-20" }, true],
    ["el cliente quiere un día antes del suyo", {}, { service_date: "2026-10-31" }, false],
  ];

  it.each([...route, ...anyDestination, ...whereNow, ...dates])("%s", (_, a, r, expected) => {
    expect(matchesTrip(driver(a), request(r))).toBe(expected);
  });

  // Todas las combinaciones de lo que el cliente mueve y lo que le queda.
  const order = ["sobres", "carga_parcial", "medio_camion", "camion_entero"] as const;
  const spaces = ["solo_paquetes", "carga_parcial", "medio_camion", "camion_entero"] as const;
  it.each(spaces.flatMap((space, i) => order.map((volume, j) => [space, volume, j <= i] as const)))(
    "le queda %s y el cliente mueve %s: %s",
    (space, volume, expected) => {
      expect(matchesTrip(driver({ space }), request({ volume }))).toBe(expected);
      // Lo mismo con cualquier destino.
      expect(matchesTrip(driver({ space, destination_city: ANY_DESTINATION }), request({ volume }))).toBe(expected);
    },
  );
});

describe("con la carretera guardada", () => {
  // Bogotá → Barranquilla por la Ruta del Sol.
  const road = driver({ ...trip("bogota", "barranquilla"), route: BOGOTA_BARRANQUILLA_ROUTE });
  const straight = driver({ ...trip("bogota", "barranquilla"), route: null });

  const cases: [string, Partial<RequestLike>, boolean][] = [
    ["de Bogotá a Barranquilla", {}, true],
    ["de Guaduas a Aguachica, sobre la carretera", trip("guaduas", "aguachica"), true],
    ["de Pailitas a Bosconia, sobre la carretera", trip("pailitas", "bosconia"), true],
    ["de Honda, a unos km de la carretera, a Ciénaga", trip("honda", "cienaga"), true],
    ["de Soacha, pegado a su origen", trip("soacha", "barranquilla"), true],
    ["de Aguachica a Guaduas, devolviéndose", trip("aguachica", "guaduas"), false],
    ["de Medellín a Cartagena, que no va por ahí", trip("medellin", "cartagena"), false],
    ["de Ibagué a Barranquilla, lejos de la carretera", trip("ibague", "barranquilla"), false],
    ["de Villavicencio, detrás de su origen", trip("villavicencio", "barranquilla"), false],
  ];

  it.each(cases)("%s", (_, r, expected) => {
    expect(matchesTrip(road, request({ ...trip("bogota", "barranquilla"), ...r }))).toBe(expected);
  });

  it("arregla lo que la línea recta dejaba pasar", () => {
    const medellinCartagena = request(trip("medellin", "cartagena"));
    expect(matchesTrip(straight, medellinCartagena)).toBe(true);
    expect(matchesTrip(road, medellinCartagena)).toBe(false);
  });

  it("si marcó por dónde va, cuenta los km sobre la carretera", () => {
    const inAguachica = { ...road, current_city: "aguachica" };
    expect(matchesTrip(inAguachica, request(trip("pailitas", "barranquilla")))).toBe(true);
    // Pelaya queda más adelante, Puerto Salgar quedó muy atrás.
    expect(matchesTrip(inAguachica, request(trip("pelaya", "bosconia")))).toBe(true);
    expect(matchesTrip(inAguachica, request(trip("puerto-salgar", "barranquilla")))).toBe(false);
  });

  it("una carretera dañada vale como si no hubiera: la línea recta", () => {
    const broken = { ...road, route: "dañada" };
    expect(matchesTrip(broken, request(trip("medellin", "cartagena")))).toBe(true);
  });
});

describe("newestBy", () => {
  it("un transportista que quedó dos veces sale una sola, con lo último que guardó", () => {
    // Llegan de la más nueva a la más vieja, como en la consulta.
    const rows = [
      { id: "nueva", whatsapp: "573001112233" },
      { id: "otro", whatsapp: "573004445566" },
      { id: "vieja", whatsapp: "573001112233" },
    ];
    expect(newestBy(rows, (r) => r.whatsapp).map((r) => r.id)).toEqual(["nueva", "otro"]);
  });

  it("un cliente que buscó dos veces para el mismo viaje sale una vez; otro viaje suyo también sale", () => {
    const trip = (id: string, service_date: string) => ({ id, whatsapp: "573001112233", service_date });
    const rows = [trip("ultima", "2026-11-01"), trip("primera", "2026-11-01"), trip("otro-dia", "2026-11-05")];
    const key = (r: { whatsapp: string; service_date: string }) => `${r.whatsapp}|${r.service_date}`;
    expect(newestBy(rows, key).map((r) => r.id)).toEqual(["ultima", "otro-dia"]);
  });
});
