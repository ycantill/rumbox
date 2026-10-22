// Una carretera de prueba de Bogotá a Barranquilla por la Ruta del Sol,
// armada con los pueblos por donde pasa (el servicio de rutas da miles de
// puntos; para las pruebas bastan estos).
import { getCity } from "../cities";
import { encodePath, type Point } from "../path";

const via = [
  "bogota",
  "villeta",
  "guaduas",
  "puerto-salgar",
  "puerto-boyaca",
  // Puerto Araújo, sobre la carretera, entre Puerto Boyacá y San Alberto.
  { lat: 6.55, lng: -74.1 },
  "san-alberto",
  "san-martin-cesar",
  "aguachica",
  "pelaya",
  "pailitas",
  "curumani",
  "bosconia",
  "el-copey",
  "fundacion",
  "aracataca",
  "cienaga",
  "barranquilla",
];

export const BOGOTA_BARRANQUILLA: Point[] = via.map((v) => {
  if (typeof v !== "string") return v;
  const c = getCity(v)!;
  return { lat: c.lat, lng: c.lng };
});

export const BOGOTA_BARRANQUILLA_ROUTE = encodePath(BOGOTA_BARRANQUILLA);
