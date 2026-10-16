// Municipios soportados en el piloto. Coordenadas aproximadas del casco urbano.
// Para ampliar cobertura basta con agregar filas; más adelante se puede
// reemplazar por un servicio de geocodificación (Google Places, Mapbox).

export type City = {
  slug: string;
  name: string;
  department: string;
  lat: number;
  lng: number;
};

export const CITIES: City[] = [
  // Córdoba (región piloto)
  { slug: "monteria", name: "Montería", department: "Córdoba", lat: 8.7479, lng: -75.8814 },
  { slug: "cerete", name: "Cereté", department: "Córdoba", lat: 8.8854, lng: -75.7905 },
  { slug: "lorica", name: "Lorica", department: "Córdoba", lat: 9.2366, lng: -75.8139 },
  { slug: "sahagun", name: "Sahagún", department: "Córdoba", lat: 8.9463, lng: -75.4428 },
  { slug: "planeta-rica", name: "Planeta Rica", department: "Córdoba", lat: 8.4089, lng: -75.5852 },
  { slug: "montelibano", name: "Montelíbano", department: "Córdoba", lat: 7.9792, lng: -75.4203 },
  { slug: "tierralta", name: "Tierralta", department: "Córdoba", lat: 8.1728, lng: -76.0594 },
  { slug: "chinu", name: "Chinú", department: "Córdoba", lat: 9.1058, lng: -75.3983 },
  { slug: "cienaga-de-oro", name: "Ciénaga de Oro", department: "Córdoba", lat: 8.8753, lng: -75.6211 },
  { slug: "san-pelayo", name: "San Pelayo", department: "Córdoba", lat: 8.9583, lng: -75.8381 },
  { slug: "san-antero", name: "San Antero", department: "Córdoba", lat: 9.3742, lng: -75.7589 },
  // Costa Caribe
  { slug: "sincelejo", name: "Sincelejo", department: "Sucre", lat: 9.3047, lng: -75.3978 },
  { slug: "corozal", name: "Corozal", department: "Sucre", lat: 9.3183, lng: -75.2933 },
  { slug: "tolu", name: "Santiago de Tolú", department: "Sucre", lat: 9.5244, lng: -75.5814 },
  { slug: "cartagena", name: "Cartagena", department: "Bolívar", lat: 10.391, lng: -75.4794 },
  { slug: "magangue", name: "Magangué", department: "Bolívar", lat: 9.2414, lng: -74.7536 },
  { slug: "barranquilla", name: "Barranquilla", department: "Atlántico", lat: 10.9685, lng: -74.7813 },
  { slug: "santa-marta", name: "Santa Marta", department: "Magdalena", lat: 11.2408, lng: -74.199 },
  { slug: "valledupar", name: "Valledupar", department: "Cesar", lat: 10.4631, lng: -73.2532 },
  { slug: "riohacha", name: "Riohacha", department: "La Guajira", lat: 11.5444, lng: -72.9072 },
  // Antioquia / Urabá
  { slug: "caucasia", name: "Caucasia", department: "Antioquia", lat: 7.9864, lng: -75.1933 },
  { slug: "apartado", name: "Apartadó", department: "Antioquia", lat: 7.8828, lng: -76.6253 },
  { slug: "turbo", name: "Turbo", department: "Antioquia", lat: 8.0928, lng: -76.7281 },
  { slug: "medellin", name: "Medellín", department: "Antioquia", lat: 6.2442, lng: -75.5812 },
  // Centro - Occidente
  { slug: "bogota", name: "Bogotá", department: "Cundinamarca", lat: 4.711, lng: -74.0721 },
  { slug: "tunja", name: "Tunja", department: "Boyacá", lat: 5.5353, lng: -73.3678 },
  { slug: "bucaramanga", name: "Bucaramanga", department: "Santander", lat: 7.1193, lng: -73.1227 },
  { slug: "cucuta", name: "Cúcuta", department: "Norte de Santander", lat: 7.8939, lng: -72.5078 },
  { slug: "manizales", name: "Manizales", department: "Caldas", lat: 5.0703, lng: -75.5138 },
  { slug: "pereira", name: "Pereira", department: "Risaralda", lat: 4.8133, lng: -75.6961 },
  { slug: "armenia", name: "Armenia", department: "Quindío", lat: 4.5339, lng: -75.6811 },
  { slug: "ibague", name: "Ibagué", department: "Tolima", lat: 4.4389, lng: -75.2322 },
  { slug: "cali", name: "Cali", department: "Valle del Cauca", lat: 3.4516, lng: -76.532 },
  { slug: "neiva", name: "Neiva", department: "Huila", lat: 2.9273, lng: -75.2819 },
  { slug: "villavicencio", name: "Villavicencio", department: "Meta", lat: 4.142, lng: -73.6266 },
  { slug: "popayan", name: "Popayán", department: "Cauca", lat: 2.4448, lng: -76.6147 },
  { slug: "pasto", name: "Pasto", department: "Nariño", lat: 1.2136, lng: -77.2811 },
];

const BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));

export function getCity(slug: string | null | undefined): City | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** Ciudad más cercana a unas coordenadas (para autocompletar con GPS). */
export function nearestCity(lat: number, lng: number): City {
  let best = CITIES[0];
  let bestKm = Infinity;
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Factor para pasar de distancia en línea recta a distancia aproximada por carretera. */
export const ROAD_FACTOR = 1.3;
/** Distancia asumida para un servicio dentro de la misma ciudad. */
export const URBAN_TRIP_KM = 8;

/** Distancia estimada por carretera entre dos municipios. */
export function roadDistanceKm(fromSlug: string, toSlug: string): number {
  const a = getCity(fromSlug);
  const b = getCity(toSlug);
  if (!a || !b) throw new Error(`Ciudad desconocida: ${!a ? fromSlug : toSlug}`);
  if (a.slug === b.slug) return URBAN_TRIP_KM;
  return Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng) * ROAD_FACTOR);
}
