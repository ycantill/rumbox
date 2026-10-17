import { describe, expect, it } from "vitest";
import { CITIES, getCity, nearestCity, searchCities } from "../cities";

// Slugs que ya se guardaban en la base de datos antes de agregar todo el país.
const SAVED_SLUGS = [
  // Córdoba
  "ayapel", "buenavista-cordoba", "canalete", "cerete", "chima", "chinu", "cienaga-de-oro", "cotorra",
  "la-apartada", "lorica", "los-cordobas", "momil", "montelibano", "monteria", "monitos", "planeta-rica",
  "pueblo-nuevo", "puerto-escondido", "puerto-libertador", "purisima", "sahagun", "san-andres-de-sotavento",
  "san-antero", "san-bernardo-del-viento", "san-carlos", "san-jose-de-ure", "san-pelayo", "tierralta",
  "tuchin", "valencia",
  // Sucre
  "buenavista-sucre", "caimito", "chalan", "coloso", "corozal", "covenas", "el-roble", "galeras", "guaranda",
  "la-union", "los-palmitos", "majagual", "morroa", "ovejas", "palmito", "sampues", "san-benito-abad",
  "san-juan-de-betulia", "san-marcos", "san-onofre", "san-pedro", "tolu", "since", "sincelejo", "sucre",
  "toluviejo",
  // El resto del país
  "cartagena", "magangue", "barranquilla", "santa-marta", "valledupar", "riohacha", "caucasia", "apartado",
  "turbo", "medellin", "bogota", "tunja", "bucaramanga", "cucuta", "manizales", "pereira", "armenia", "ibague",
  "cali", "neiva", "villavicencio", "popayan", "pasto",
];

describe("CITIES", () => {
  it("están todos los municipios de Colombia", () => {
    expect(CITIES).toHaveLength(1122);
    expect(new Set(CITIES.map((c) => c.department)).size).toBe(33);
    expect(CITIES.filter((c) => c.department === "Córdoba")).toHaveLength(30);
    expect(CITIES.filter((c) => c.department === "Sucre")).toHaveLength(26);
  });

  it("los slugs que ya se guardaban en la base siguen ahí", () => {
    for (const slug of SAVED_SLUGS) expect(getCity(slug), slug).toBeDefined();
    expect(getCity("monteria")).toMatchObject({ name: "Montería", lat: 8.7479, lng: -75.8814 });
  });

  it("cada municipio tiene un slug y un nombre únicos", () => {
    expect(new Set(CITIES.map((c) => c.slug)).size).toBe(CITIES.length);
    // Si el nombre se repite en otro departamento, lleva el departamento: "La Unión (Sucre)".
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(CITIES.length);
    expect(getCity("la-union")?.name).toBe("La Unión (Sucre)");
  });

  it("las coordenadas quedan dentro de Colombia, con San Andrés y Providencia", () => {
    for (const c of CITIES) {
      expect(c.lat, c.slug).toBeGreaterThan(-4.3);
      expect(c.lat, c.slug).toBeLessThan(13.5);
      expect(c.lng, c.slug).toBeGreaterThan(-81.8);
      expect(c.lng, c.slug).toBeLessThan(-66.8);
    }
  });
});

describe("nearestCity", () => {
  it("con el botón Ubicarme encuentra el pueblo, no uno vecino", () => {
    expect(nearestCity(9.239, -75.676).slug).toBe("momil");
    expect(nearestCity(8.313, -75.145).slug).toBe("ayapel");
  });
});

describe("searchCities", () => {
  const slugs = (q: string) => searchCities(q).map((c) => c.slug);

  it("encuentra sin tildes ni mayúsculas", () => {
    expect(slugs("monteria")[0]).toBe("monteria");
    expect(slugs("MONTERÍA")[0]).toBe("monteria");
    expect(slugs("narino")).toContain("narino-antioquia");
  });

  it("a igual coincidencia van en orden alfabético, sin preferir ninguna región", () => {
    expect(slugs("monte").slice(0, 3)).toEqual(["montebello", "montecristo", "montelibano"]);
  });

  it("encuentra por una palabra del nombre, después de los que empiezan así", () => {
    const buga = slugs("buga");
    expect(buga[0]).toBe("bugalagrande");
    expect(buga).toContain("guadalajara-de-buga");
  });

  it("acepta el departamento para distinguir nombres repetidos", () => {
    expect(slugs("san pedro valle")[0]).toBe("san-pedro-valle-del-cauca");
    expect(slugs("monteria cordoba")[0]).toBe("monteria");
  });

  it("sin texto o sin coincidencias no devuelve nada", () => {
    expect(searchCities("")).toEqual([]);
    expect(searchCities("  ")).toEqual([]);
    expect(searchCities("xyz")).toEqual([]);
  });
});
