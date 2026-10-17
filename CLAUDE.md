@AGENTS.md

# Muvia · guía para Claude

Muvia es una PWA de mudanzas, fletes y envíos para el piloto de Córdoba y la
Costa (Colombia). Conecta clientes con transportistas que tienen espacio libre,
ya sea en su ciudad o porque ya van hacia otro lado. Sin registro, sin
comisiones y con contacto directo por WhatsApp. El alcance del MVP está en
[docs/MVP.md](docs/MVP.md) y la visión de negocio completa (modelo, precios,
emparejamiento, monetización, roadmap) en docs/negocio/.
Léelos antes de proponer funciones nuevas. Si el documento de negocio y las
decisiones de abajo no coinciden, mandan las decisiones de abajo. Lo que falta
por decidir o construir está en [docs/pendientes.md](docs/pendientes.md):
cuando termines algo de esa lista, pásalo a "Hecho" con su PR.

La dueña del producto es Yohany y escribe en español. Responde, nombra los
commits y escribe los textos de la app en español.

## Comandos

```bash
npm install          # dependencias
npm run dev          # servidor de desarrollo en http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # next typegen + tsc --noEmit
npm test             # Vitest (src/lib/__tests__)
npm run build        # build de producción
```

El CI (`.github/workflows/ci.yml`) corre lint, typecheck, test y build en cada
PR. Corre los cuatro antes de dar un cambio por terminado.

## Stack y estructura

- Next.js 16 (App Router, TypeScript, Server Actions) con `cacheComponents`
  activado. No es el Next.js que conoces: revisa `node_modules/next/dist/docs/`
  antes de usar una API.
- Tailwind CSS 4, Supabase (PostgreSQL) y Vercel.

```
src/app/page.tsx                 Inicio
src/app/cotizar/                 Cliente: asistente de 4 pasos con precio y transportistas
src/app/transportista/           Transportista: ponerse disponible y ver su servicio
src/app/actions.ts               Server Actions (publishAvailability, updateAvailability,
                                 getMyAvailability, requestQuote)
src/components/ui.tsx            Componentes compartidos y useBogotaDates
src/components/vehicle-icon.tsx  Dibujos de cada vehículo
src/lib/domain.ts                Vocabulario: vehículos, espacios, jornadas, mano de obra
src/lib/matching.ts              Emparejamiento por radio y por ruta
src/lib/pricing.ts               Precios (tarifas provisionales)
src/lib/cities.ts                Municipios del piloto con coordenadas
src/lib/local-store.ts           Datos que recuerda el navegador (localStorage)
supabase/migrations/             Esquema: availabilities, requests, reviews
public/sw.js                     Service worker
```

## Convenciones del código

- Todo acceso a datos pasa por Server Actions con `db()` de
  `src/lib/supabase.ts`, que usa la service role key solo en el servidor. Las
  tablas tienen RLS sin políticas públicas. Nunca expongas la clave al
  navegador ni le pongas el prefijo `NEXT_PUBLIC_`.
- Desde el navegador, llama las Server Actions con `callServer()` de
  `src/lib/server-call.ts`. Con mala señal la llamada falla y, sin eso, el
  error rompe la pantalla y la persona pierde lo que llenó.
- Con `cacheComponents` no se puede usar `new Date()` durante el render. Para
  "hoy" y "mañana" usa `useBogotaDates()`; las fechas van en hora de Colombia.
- Las etiquetas visibles viven en `src/lib/domain.ts`. Cambia el texto ahí, no
  en cada componente, y conserva las claves internas (`manana`, `camion_entero`,
  etc.) porque se guardan en la base de datos.
- Un cambio de esquema va en una migración nueva numerada en
  `supabase/migrations/` (por ejemplo `0002_...sql`), nunca editando
  `0001_init.sql`. Avisa a Yohany que debe correrla en Supabase antes de
  desplegar.
- La lógica de precios y emparejamiento tiene pruebas en `src/lib/__tests__`;
  si la cambias, actualiza o agrega pruebas.
- Los comentarios y las descripciones de las pruebas van en español. Los
  nombres de funciones, variables, tipos, componentes y archivos van en inglés,
  como ya está todo el código (`publishAvailability`, `matchKind`,
  `driver-form.tsx`). Las claves internas que se guardan en la base
  (`manana`, `activa`) sí están en español.
- Mantén `docs/MVP.md` al día cuando cambie una decisión de producto.

## Decisiones de producto

Estas decisiones las tomó Yohany y no se cambian sin preguntarle.

**Audiencia y tono**
- La app es para personas que no manejan mucho el celular. Textos cortos, que
  suenen a una persona hablando, y preguntas simples ("¿Desde dónde?",
  "¿Hacia dónde?", "¿Qué vehículo tienes?").
- Nada de jerga técnica en pantalla: no "cotizar", "ruta programada", "mano de
  obra", "tarifa", "GPS", "Modo Ruta", "local", "zona" ni distancias en km.
- Los errores usan el mismo tono, por ejemplo "Elige si ayudas a cargar".

**Sin cuentas**
- No hay login ni contraseñas ("Cero registros"). El WhatsApp identifica cada
  disponibilidad y el contacto es por enlaces `wa.me`.
- El transportista controla su disponibilidad con un token que vive en su
  teléfono (localStorage); en la base solo se guarda el hash. Por eso "uno a la
  vez" vale por teléfono.

**El transportista se pone disponible, no publica**
- En el sistema cada registro es una publicación (`availabilities`), pero en la
  pantalla del transportista nunca se habla de publicar: él "se pone
  disponible".
- No repitas la palabra "disponible". Solo aparece en el botón "Ponerme
  disponible" y en el título "Estás disponible para este servicio".
- No le prometas clientes: nada de "Estás recibiendo clientes".

**Un trabajo a la vez, desde una fecha**
- El transportista tiene una sola disponibilidad activa. Si ya tiene una, la
  pantalla muestra "Estás disponible para este servicio" con sus datos, los
  clientes que lo esperan (cada uno con su día) y al final el aviso de
  WhatsApp, en vez del formulario. No hay lista de varios días.
- Sin destino, el formulario pregunta "¿Desde cuándo puedes trabajar?". El
  match exige que la fecha del cliente sea igual o posterior a `service_date`.
- Sin destino dura una semana (`AVAILABILITY_DAYS`): les sale a los clientes
  desde esa fecha y los 6 días siguientes, y la tarjeta cuenta los días ("Se
  vence en 6 días", "Se vence mañana", "Se vence hoy"). Cuando se vence, la
  tarjeta dice "Pasó una semana. ¿Sigues trabajando?" y ofrece "Renovar una
  semana más" (la deja desde hoy por otra semana) o "No por ahora" (la retira
  sin pedir confirmar y vuelve el formulario con sus datos). Renovar a mano es
  gratis.
- Con destino es un viaje: la pregunta es "¿Qué día viajas?", su tarjeta dice
  "Viajas…" y solo le salen clientes de ese mismo día (`service_date` es el día
  del viaje). Cuando pasa ese día se apaga sola y vuelve el formulario con sus
  datos.
- Las rutas que se repiten (todos los días o todas las semanas) son una mejora
  futura para el transportista: las "disponibilidades programadas". No van
  en el MVP: quien repite una ruta registra cada viaje.
- Un solo botón para apagarla: "Ya no voy a trabajar" (también sirve si se
  llenó). Pide confirmar y luego vuelve al formulario con
  los mismos datos. También existe "Solo queda espacio para paquetes".

**Destino y emparejamiento**
- El destino es opcional ("¿Vas a algún lado? (opcional)"). No hay opción
  Local/Nacional.
- Con destino, el sistema activa por debajo el Modo Ruta: hace match con
  clientes del día del viaje cuyo origen y destino quedan sobre el corredor y
  en el mismo sentido, y el cliente recibe un 25% de descuento.
- Sin destino, el match es por radio (40 km) alrededor del origen.
- El transportista no debe ver esta lógica en la pantalla.

**Jornadas, vehículos y espacio**
- Jornadas sin horas: "Por la mañana", "Por la tarde", "Por la noche" y "Todo
  el día". El prefijo "Por la" evita confundir "mañana" con el día siguiente.
- Para "Hoy" solo se muestran las jornadas que no han pasado en hora de
  Colombia (cortes a las 12, 18 y 22 h); después de las 10 pm desaparece
  "Hoy".
- El espacio libre depende del vehículo (`VEHICLE_SPACES`): furgón y estacas
  hasta camión entero, pick-up hasta medio camión, carro particular solo baúl
  o asientos traseros. Si cambia a un vehículo donde no cabe, se borra el
  espacio elegido.
- Cada vehículo se muestra con un dibujo sencillo que toma el color del texto
  (tema claro y oscuro).

**Precios**
- Las tarifas de `src/lib/pricing.ts` son provisionales y se calibrarán con
  precios reales del piloto.

**Fuera del MVP** (ver docs/MVP.md): fotos, API oficial de WhatsApp y
notificaciones, reseñas automáticas, formularios offline, monetización
(incluidas las disponibilidades programadas), autocompletado de direcciones y
anti-spam.
