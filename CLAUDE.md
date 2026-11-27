@AGENTS.md

# Rumbox · guía para Claude

Rumbox es una PWA de carga (mudanzas, fletes y encomiendas) en Colombia; todavía no está
definido dónde será el piloto, así que no favorezcas ninguna región. Conecta
clientes con transportistas que ya van hacia otro lado y tienen espacio libre.
Sin registro, sin comisiones y con contacto directo por llamada o WhatsApp. El
alcance del MVP está en [docs/MVP.md](docs/MVP.md). La visión de negocio
completa (modelo, precios, monetización, roadmap) es privada y no está en el
repositorio: pídesela a Yohany si la necesitas. Lee el MVP antes de proponer
funciones nuevas. Si el documento de negocio y las decisiones de abajo no
coinciden, mandan las decisiones de abajo. Lo que falta por decidir o construir está en
[docs/pendientes.md](docs/pendientes.md): cuando termines algo de esa lista,
pásalo a "Hecho" con su PR.

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
npm run db:start     # Supabase local en Docker, con todas las migraciones
npm run test:e2e     # Playwright contra la app compilada y el Supabase local
npm run db:stop      # apaga el Supabase local
```

El CI (`.github/workflows/ci.yml`) corre lint, typecheck, test y build en cada
PR, y en otro job las pruebas E2E. Corre todo antes de dar un cambio por terminado.

### Pruebas E2E (`e2e/`)

- Corren contra un Supabase local real (`supabase/config.jsonc`, CLI fijada en
  `devDependencies`), nunca contra la base de producción. Las llaves salen de
  `supabase status`; son las de desarrollo del stack local.
- Antes de cada corrida `e2e/global-setup.ts` vacía las tablas.
- Cada prueba usa municipios distintos y su propio teléfono (`celular()`), porque
  corren en paralelo contra la misma base y el límite es de 3 viajes por número.
- Busca los elementos por rol y texto (`getByRole`), como los ve una persona.
  Si cambias un texto de la interfaz, ajusta la prueba.
- `e2e/calidad.spec.ts` revisa WCAG 2.2 AA con axe en todas las páginas y que no
  haya scroll horizontal a 360 px. Un error de axe es un error de la app.

## Stack y estructura

- Next.js 16 (App Router, TypeScript, Server Actions) con `cacheComponents`
  activado. No es el Next.js que conoces: revisa `node_modules/next/dist/docs/`
  antes de usar una API.
- Tailwind CSS 4, Supabase (PostgreSQL) y Vercel.

```
src/app/page.tsx                 Inicio
src/app/solicitar/               Cliente: formulario para solicitar transportista
src/app/transportista/           Transportista: ponerse disponible y ver su servicio
src/app/ayuda/                   Ayuda: fraudes y seguridad
src/app/privacidad/              Cómo cuidamos sus datos (aviso de privacidad)
src/app/terminos/                Términos y condiciones
src/app/robots.ts, sitemap.ts    Para Google; src/lib/site.ts tiene el dominio y el noindex
src/app/actions.ts               Server Actions (publishAvailability, updateAvailability,
                                 getMyAvailability, updateServices, updateLocation,
                                 createRequest,
                                 getMyRequest, closeRequest,
                                 getLiveConfig, trackEvent)
src/components/ui.tsx            Componentes compartidos (hojas de abajo, Toast) y useBogotaDates
src/components/support.tsx       Piezas de /ayuda y /privacidad
src/components/one-at-a-time.tsx GoToActive, BackHome y BackLink: llevan a lo que el teléfono tiene abierto
src/components/service-worker.tsx Registra public/sw.js
src/app/not-found.tsx, error.tsx "No encontramos esta página" y la pantalla cuando algo falla
src/lib/domain.ts                Vocabulario: servicios, días y destinos
src/lib/supabase.ts              db(): la conexión del servidor con la service role key
src/lib/server-call.ts           callServer(): llamar una Server Action sin romper la pantalla
src/lib/dates.ts                 Los días: cómo se escriben ("sábado 18 de octubre") y hasta cuándo vale una solicitud
src/lib/whatsapp.ts              El teléfono: validarlo, escribirlo "300 123 4567" y los enlaces wa.me y tel:
src/lib/validate.ts              Lo que falta en los formularios (navegador y servidor, mismos textos)
src/lib/rate-limit.ts            Límites por teléfono y por conexión
src/lib/legal.ts                 El responsable de los datos y las fechas de privacidad y términos
src/lib/one-at-a-time.ts         Qué tiene abierto el teléfono (solicitud o viaje)
src/lib/toast.ts                 El aviso de abajo al cerrar algo
src/lib/matching.ts              Emparejamiento por ruta
src/lib/route.ts                 La ruta del transportista pueblo por pueblo y por dónde va
src/lib/path.ts, directions.ts   La carretera: guardarla y medir sobre ella; pedirla a OpenRouteService
src/lib/maps.ts                  El enlace de "Comenzar viaje en Maps" al mapa (Google o Apple)
src/lib/cities.ts                Todos los municipios de Colombia (DIVIPOLA) y su búsqueda
src/lib/local-store.ts           Datos que recuerda el navegador (localStorage)
src/lib/refresh.ts               Volver a pedir las listas al regresar a la app y cada minuto
src/lib/analytics.ts, track.ts  Analíticas: qué se cuenta y cómo se manda desde el navegador
src/lib/safety.ts                Consejos de seguridad
src/lib/live.ts                  Realtime en el navegador (lista del cliente al día) y sus canales
supabase/migrations/             Esquema: availabilities, requests, events
public/sw.js                     Service worker
```

## Convenciones del código

- Todo acceso a datos pasa por Server Actions con `db()` de
  `src/lib/supabase.ts`, que usa la service role key solo en el servidor. Las
  tablas tienen RLS sin políticas públicas. Nunca expongas la clave al
  navegador ni le pongas el prefijo `NEXT_PUBLIC_`. El navegador solo usa la
  anon key para escuchar el canal de Realtime, que no lleva datos; se la da
  el servidor con `getLiveConfig`, sin prefijo `NEXT_PUBLIC_`.
- Desde el navegador, llama las Server Actions con `callServer()` de
  `src/lib/server-call.ts`. Con mala señal la llamada falla y, sin eso, el
  error rompe la pantalla y la persona pierde lo que llenó.
- Con `cacheComponents` no se puede usar `new Date()` durante el render. Para
  "hoy" y "mañana" usa `useBogotaDates()`; las fechas van en hora de Colombia.
- Las etiquetas visibles viven en `src/lib/domain.ts`. Cambia el texto ahí, no
  en cada componente, y conserva las claves internas (`mudanza`, `cualquier_dia`,
  `activa`, etc.) porque se guardan en la base de datos.
- Un cambio de esquema va en una migración nueva numerada en
  `supabase/migrations/` (por ejemplo `0002_...sql`), nunca editando
  `0001_init.sql`. Avisa a Yohany que debe correrla en Supabase antes de
  desplegar.
- La lógica de emparejamiento y del vocabulario tiene pruebas en
  `src/lib/__tests__`; si la cambias, actualiza o agrega pruebas.
- Los comentarios y las descripciones de las pruebas van en español. Los
  nombres de funciones, variables, tipos, componentes y archivos van en inglés,
  como ya está todo el código (`publishAvailability`, `matchesTrip`,
  `driver-form.tsx`). Las claves internas que se guardan en la base
  (`manana`, `activa`) sí están en español.
- Mantén `docs/MVP.md` al día cuando cambie una decisión de producto.

## Decisiones de producto

Estas decisiones las tomó Yohany y no se cambian sin preguntarle.

**Nombre**
- La app se llama Rumbox (Yohany, 27 de octubre de 2026): rumbo + box, la vía
  y la caja de cartón. Antes se llamó Muvia (muvia.co ya tenía dueño) y luego
  Mudavía. El repo sigue siendo `ycantill/muvia`, y las claves de
  localStorage (`muvia.*`) y la caché del service worker (`muvia-v1`)
  conservan el nombre de antes para que nadie pierda lo que tiene guardado.

**Diseño de Rumbox** (Yohany, 27 de octubre de 2026, hecho en Claude Design)
- La identidad y las pantallas vienen del handoff de Claude Design: colores
  Señal `#1a3f73`, Ocre vial `#e2bf76`, Cartón `#b7987b` y Noche `#0f1b2d`
  (tokens en `globals.css`), Big Shoulders Display para títulos en
  mayúsculas y Archivo para el texto, bordes de 1px, radios de 6 a 8px y sin
  sombras. `Logo`, `Symbol` y los íconos de servicios están en
  `src/components/ui.tsx`.
- Los textos del diseño mandan (Yohany: "respeta los textos del diseño"),
  aunque difieran de los que se acordaron antes. Los que cita esta guía son
  los de la app al 29 de octubre de 2026; si alguno quedó viejo, vale la
  decisión y el texto es el de la app. Toda la app trata de **usted** ("¿Hacia dónde va?", "Elija
  qué servicio necesita"), incluidos errores, consejos, `/ayuda` y
  `/privacidad`.
- Al que viaja, en la pantalla del cliente, se le dice "conductor" ("Buscar
  conductor", "3 conductores van para allá"); en el inicio, su botón es "Voy
  de viaje". En el código y la base sigue siendo transportista.
- El diseño no cubre el modo oscuro: por ahora la app se ve siempre clara.

**Solo carga** (Yohany, 4 de noviembre de 2026)
- El MVP se enfoca en el mercado de furgones y camiones de estacas: solo
  carga. Salieron los encargos y las diligencias (que llegaron con el diseño
  el 27 de octubre) y siguen por fuera los carros particulares. El vehículo
  sigue sin preguntarse.
- La migración `0023_solo_carga.sql` cierra las solicitudes abiertas de
  encargo o diligencia, se los quita a los que viajan (si solo hacían eso,
  su disponibilidad se apaga) y la base deja de aceptarlos. Si el navegador
  todavía los tiene guardados, el cliente vuelve al formulario y al que
  viaja se le quitan (y vuelve al formulario si no le queda ninguno).

**Servicios** (Yohany, 27 de octubre de 2026, con el diseño)
- Son tres: mudanza, flete y encomienda (`SERVICES` en
  `src/lib/domain.ts`; eran cinco hasta "Solo carga"). El cliente elige uno en "¿Qué necesita?" y se guarda
  en `requests.service`. El que viaja marca los que hace en "¿Qué servicios
  hace?" (`availabilities.services`, migración `0020_servicios.sql`), y solo
  le salen los clientes que piden uno de esos. Reemplaza el "sin casillas,
  todos hacen todo" del 26 de octubre.
- No se pregunta el tamaño ni el espacio (Yohany, 28 de octubre de 2026):
  es aproximado y lo hablan por teléfono, como el precio. Filtran solo los
  servicios. Antes la mudanza preguntaba "¿Qué tan grande?" y el que viaja
  "¿Cuánto espacio tiene?". Las columnas `requests.volume` y
  `availabilities.space` y `full_space` se quitaron en la limpieza (ver
  "Limpieza de la base").
- "¿Qué servicios hace ahora?" (Yohany, 28 de octubre de 2026): debajo de
  sus datos, el que viaja cambia sus servicios durante el viaje
  (`updateServices`, migración `0021_servicios_en_el_camino.sql`). Si se
  llena, quita mudanzas y fletes y le siguen saliendo las encomiendas; si
  descarga a mitad de camino, los vuelve a marcar. Sin ninguno no se puede:
  para eso está "Ya no estoy disponible".
- Los errores de los formularios son los del prototipo: el botón se ve
  apagado (opacidad 60%, no menos: con 50% el texto no llega al contraste 3:1
  de WCAG y el botón sí se puede tocar) mientras falta algo y, al tocarlo, dice debajo qué
  falta ("Elija qué servicio necesita.", "Revise la ruta.", "Elija al menos
  un servicio.", "Escriba su número de 10 dígitos."). El teléfono se va
  escribiendo como "300 123 4567".
- Lo guardado antes de los servicios: las solicitudes sin servicio le sirven
  a cualquiera y las disponibilidades sin servicios hacen todos.
- En los resultados del cliente, cada tarjeta lleva ↑ si el conductor va
  directo a su destino (o a cualquiera) y ↗ si pasa por su destino y sigue.

**Audiencia y tono**
- La app es para personas que no manejan mucho el celular. Textos cortos, que
  suenen a una persona hablando, y preguntas simples ("¿Qué necesita?",
  "¿Hacia dónde va?", "¿Para cuándo?").
- Nada de jerga técnica en pantalla: no "cotizar", "ruta programada", "mano de
  obra", "tarifa", "GPS", "Modo Ruta", "local", "zona" ni distancias en km.
- Los errores usan el mismo tono, por ejemplo "Elija al menos un servicio".

**Sin cuentas**
- No hay login ni contraseñas ("Cero registros"). El número de teléfono
  identifica cada disponibilidad; el cliente no da número.
- El transportista controla su disponibilidad con un token que vive en su
  teléfono (localStorage); en la base solo se guarda el hash. Por eso "uno a la
  vez" vale por teléfono. El cliente controla su solicitud igual, con su
  propio token; las solicitudes de antes no tienen token y no las controla
  nadie.

**Llamada o WhatsApp**
- Al transportista se le pide "Su teléfono", no "Su WhatsApp": el número sirve
  para llamar y para escribir por WhatsApp ("Aquí lo llaman o le escriben por
  WhatsApp."). Se le dice que los clientes lo
  pueden llamar o escribir por WhatsApp.
- Al cliente no se le pide el teléfono (Yohany, 23 de octubre de 2026): ya no
  hay avisos y es él quien llama o escribe, así que nadie lo veía. Su
  solicitud la controla el token de su teléfono. La columna `whatsapp` de
  `requests` se quitó en la limpieza.
- El transportista no contacta al cliente (Yohany, octubre de 2026): por la
  privacidad del cliente, siempre es el cliente quien llama o escribe. El
  transportista no ve la lista de clientes que esperan, porque una lista con
  la que no puede hacer nada solo frustra (Yohany): espera que lo llamen.
- Cada tarjeta de transportista en los resultados del cliente tiene "Escribir por
  WhatsApp", un enlace `wa.me` con el mensaje listo, y "Llamar", un enlace
  `tel:`. Los dos salen de `ContactButtons` en `src/components/ui.tsx`.
  La primera vez que toca uno en cada visita (Yohany, 27 de octubre de 2026,
  con el prototipo; antes era cada vez), sube una hoja desde abajo, "Antes de
  escribir" (o "Antes de llamar"), con los consejos para cuidarse, y el
  contacto sigue con "Entendido, escribir" (o "llamar"). Tiene "Cancelar".
  Después de eso, los botones abren WhatsApp o el teléfono de una vez.
- La columna `whatsapp` de la base y los campos que guarda el navegador
  conservan ese nombre aunque guardan el teléfono: no se renombran.

**El transportista se pone disponible, no publica**
- En el sistema cada registro es una publicación (`availabilities`), pero en la
  pantalla del transportista nunca se habla de publicar: él "se pone
  disponible".
- No repitas la palabra "disponible". Solo aparece en los botones "Ponerme
  disponible" y "Ya no estoy disponible" (Yohany, 20 de octubre de 2026; antes
  "Ya no voy a trabajar"), en el título "Usted está disponible" y en la hoja
  que confirma apagarla, con los textos del diseño.
- No le prometas clientes: nada de "Estás recibiendo clientes".

**Un viaje a la vez**
- El transportista siempre va de viaje: el formulario se titula "¿Hacia
  dónde va?", con "Está en" y "Va a" en la guía, y sigue con "¿Qué día
  sale?", "¿Qué servicios hace?" y "Su teléfono". El destino es
  obligatorio; no hay modo local (Yohany lo quitó en octubre de 2026). En la lista
  del destino, la primera opción es "Cualquier destino" ("Va a donde le
  pidan"), no un botón aparte (Yohany, octubre de 2026). También sale al
  escribir "cual" o "destino". Viene de `anyDestination` en `CitySelect` y se
  guarda como `cualquiera` (`ANY_DESTINATION`) en `destination_city`.
- Tiene una sola disponibilidad activa. Si ya tiene una, la pantalla muestra
  "Usted está disponible" con su ruta, sus servicios, el día ("Sale hoy.") y
  el aviso de que lo llaman o le escriben a su número, en vez del
  formulario. No hay lista de varios días.
- "Hoy" viene elegido. No se vence (Yohany, 21 de octubre de 2026): el día
  que elige (`service_date`) es desde cuándo viaja, y sigue encendida hasta
  "Ya no estoy disponible". Les sale a los clientes de ese día o de después y
  a los de "Cualquier día". Su tarjeta dice "Sale hoy." (o el día que
  eligió, si todavía no llega). Antes se apagaba a la medianoche de
  su día. Lo que quedó guardado sin destino, de cuando era opcional, se
  apaga y vuelve el formulario para que elija hacia dónde va.
- Las rutas que se repiten (todos los días o todas las semanas) son las
  "disponibilidades programadas", una posible mejora futura. No van
  en el MVP: quien repite una ruta registra cada viaje.
- Un solo botón para apagarla: "Ya no estoy disponible" (también sirve si se
  llenó). Pide confirmar en una hoja ("¿Dejar de estar disponible?", con el
  sí en rojo) y luego vuelve al inicio con el aviso "Ya no aparece en las
  búsquedas. Buen viaje." (Yohany, 27 de octubre de 2026). Está dentro del
  bloque oscuro de arriba. Si solo se llenó, cambia "¿Qué servicios hace
  ahora?".

**Emparejamiento**
- El match es por ruta (el Modo Ruta, por debajo): clientes de su día en
  adelante (o de "Cualquier día") cuyo origen y destino quedan sobre el
  corredor y en el mismo sentido.
- Con "Cualquier destino" el match es por origen: los mismos clientes, si
  salen de su municipio o de uno cercano (35 km, la tolerancia mínima del
  corredor), vayan a donde vayan (Yohany, octubre de 2026).
- "¿Por dónde va?" (Yohany, 21 de octubre de 2026): debajo de sus datos, el
  transportista toca en el dibujo de su ruta el pueblo por donde va, de
  los de su ruta (`routeStops`: todos los municipios por donde pasa la
  carretera, con el centro a 6 km o menos, porque muchas pasan por una
  variante sin entrar al pueblo; Yohany, 22 de octubre de 2026). Solo si
  son más de 40 se deja uno cada tanto, primero los pueblos de cruce. Sin
  carretera, uno cada ~40 km de la línea recta, como mucho 12. El dibujo
  tiene un punto por pueblo, del origen al destino, y cada uno se toca para
  marcarlo (Yohany, 22 de octubre de 2026): el de ahora dice "Usted va
  aquí" y los que ya pasó quedan en gris, con la línea recorrida en Señal,
  pero se pueden tocar por si se equivocó. Ya no hay lista desplegable con los pueblos de la ruta. Lo cambia él a mano (Yohany, 22 de octubre
  de 2026): no se usa la ubicación del teléfono. Se guarda en `current_city`
  (migración `0016_por_donde_va.sql`). Con eso no les sale a los clientes cuyo pueblo ya pasó
  (`PASSED_TOLERANCE_KM`, 3 km para lo que se corre al medir; Yohany, 28 de
  octubre de 2026: le tocaría devolverse a recoger, y el origen del cliente
  es donde se recoge o se hace el servicio; antes eran 20 km). Sin marcar,
  cuenta desde su origen: no le salen los que quedan más de 20 km detrás de
  donde sale (`BEHIND_TOLERANCE_KM`), porque puede recoger en un pueblo
  vecino antes de arrancar. Con "Cualquier
  destino" no hay ruta: elige entre todos los municipios (`CitySelect`) y el match es por cercanía a donde va, no a donde salió. El cliente
  no ve por dónde va (Yohany): solo sirve para el match.
- La ruta es por carretera (Yohany, 21 de octubre de 2026): al ponerse
  disponible, el servidor le pide la carretera a OpenRouteService (gratis con
  llave, `OPENROUTESERVICE_API_KEY` en Vercel, `src/lib/directions.ts`) y la
  guarda simplificada en `route` (migración `0017_ruta_por_carretera.sql`).
  Si otro ya hizo el mismo viaje, reusa la guardada (`route_options`). Con ella salen los
  pueblos de "¿Por dónde va?" y el match mira la carretera: el pueblo del
  cliente a 35 km o menos (`CORRIDOR_ROAD_TOLERANCE_KM`), y lo que quedó atrás
  se cuenta sobre la carretera. Si no hay llave, el servicio no responde en
  5 segundos o la disponibilidad es de antes, todo sigue con la línea recta
  y su corredor ancho (una cuarta parte del viaje a cada lado). Solo se le
  mandan las coordenadas de los dos municipios, nada de la persona.
- "Otro pueblo" (Yohany, 22 de octubre de 2026): la ruta es la más rápida,
  pero puede no ser por donde va. Debajo del dibujo de "¿Por dónde va?"
  está "+ Paso por otro pueblo", que abre un `CitySelect`, solo
  para esos. Si el
  pueblo que agrega no queda sobre su carretera (`offRoad`), `updateLocation`
  le pide a OpenRouteService la carretera pasando por ahí y la guarda en
  `route`, si no es más de 1,5 veces la de antes (`viaFits`); así la lista y
  el match siguen su camino, y le sale "Listo, su camino ahora pasa por …"
  hasta que escoja otro. Si no se puede, queda marcado igual. Reemplazó a
  "¿Por cuál camino vas?" (escoger entre 2 o 3 caminos armados con pueblos
  de cruce), que se quitó porque los caminos casi no cambiaban. La columna
  `route_options` (migración `0019_varios_caminos.sql`) queda con la más
  rápida del viaje, para reusarla, porque `route` puede cambiar.
- "Comenzar viaje en Maps" (Yohany, 22 de octubre de 2026; antes "Comienza
  tu viaje"): en el bloque oscuro de arriba, un botón abre el mapa navegando hasta su destino (`mapsUrl` en
  `src/lib/maps.ts`, un enlace sin llave): Google Maps en Android y Mapas de
  Apple en iPhone, porque viene en todos y Google Maps sin su app no guía
  (Yohany). No se manda el origen: el mapa arranca
  desde donde está el teléfono, así que sirve igual después de un desvío.
  Cuando ya lo tocó (`started`, solo en el teléfono) o marcó un pueblo en
  "¿Por dónde va?", dice "Continuar viaje en Maps". El mapa no le devuelve nada a
  Rumbox: "¿Por dónde va?" sigue a mano. Con "Cualquier destino" no sale.
- Origen y destino nunca son el mismo municipio, ni para el cliente ni para
  el transportista: no hay trasteos dentro del mismo pueblo (Yohany, octubre
  de 2026). El municipio elegido en un campo no sale en la lista del otro
  (`exclude` de `CitySelect`); si lo escribe, sale "Ese municipio ya lo
  eligió. Elija otro.". Si aun así quedan
  iguales (datos guardados de antes), sale el aviso "El origen y el destino
  deben ser distintos." (`SAME_CITY_ERROR`) debajo de la ruta, el botón dice
  "Revise la ruta." y el servidor lo rechaza. Las solicitudes así que quedaron de antes ya no le
  salen a ningún transportista.
- Fuera de "Cualquier destino" no hay match por cercanía (el antiguo radio de
  40 km alrededor del origen), ni opción Local/Nacional.
- El transportista no debe ver esta lógica en la pantalla.

**El día, sin jornadas**
- Los dos eligen solo el día: "Hoy", "Mañana" u otra fecha en el calendario.
  Yohany quitó las jornadas (mañana, tarde, noche) en octubre de 2026. "Hoy"
  sale a cualquier hora.
- El cliente tiene además "Cualquier día", arriba y elegido por defecto
  (Yohany, 21 de octubre de 2026; `ANY_DAY` en `src/lib/domain.ts`). Le
  sirven los transportistas de cualquier día, de hoy en adelante, y en su
  tarjeta dice qué día viaja cada uno. Se guarda con `service_date` vacío
  (migración `0015_cualquier_dia_sin_vencer.sql`) y no se vence (Yohany): sigue abierta
  hasta "Ya no necesito el servicio".
- La columna `time_slot` se quitó en la limpieza.

**Sin tamaño ni vehículo**
- No se pregunta el tamaño de la carga ni el espacio libre (Yohany, 28 de
  octubre de 2026; ver "Servicios"). Antes se medía por tamaño de casa
  ("Sobres y paquetes", "Algunas cosas", "Una habitación" y "Una casa").
- No se pregunta el vehículo (Yohany lo quitó en octubre de 2026). La
  columna `vehicle_type` se quitó en la limpieza.
- El carro particular (con "Espacio en el baúl" y "Asientos traseros libres")
  salió del MVP en octubre de 2026 y queda anotado para después en
  [docs/MVP.md](docs/MVP.md). Lo que quedó guardado con carro quedó apagado
  en la limpieza, y si el navegador todavía lo tiene, al transportista le
  vuelve el formulario.

**Municipios**
- Están todos los de Colombia, con los nombres oficiales de la DIVIPOLA del
  DANE. Los que ya existían conservan su nombre corto (Cúcuta, Cali…). Si un
  nombre se repite en varios departamentos, lleva el departamento entre
  paréntesis: "La Unión (Sucre)".
- Se eligen en `CitySelect` de dos formas: escribiendo parte del nombre, con o
  sin tildes (salen en orden alfabético, primero los que empiezan con lo
  escrito), o tocando la flecha para ver la lista completa, agrupada por
  departamento, y buscar al ojo. Al tocar el campo no se sugiere nada, la
  lista solo se abre con la flecha y no resalta ninguno si no hay uno elegido,
  y ninguna región va primero.
- El campo vacío dice "Escriba o elija", para invitar a las dos formas.
- No hay botón "Ubicarme" (Yohany, 22 de octubre de 2026): el origen de las
  dos pantallas se elige igual que el destino, para simplificar el MVP.
  Rumbox no pide la ubicación del teléfono en ninguna pantalla.
- Los slugs se guardan en la base de datos: no se cambian.

**El cliente llena una sola pantalla**
- El formulario del cliente es todo en una pantalla, sin pasos (Yohany,
  octubre de 2026), y con el diseño de Rumbox pregunta en este orden: "¿Qué
  necesita?" (los tres servicios en fichas, con la pista del elegido
  debajo), la ruta ("Desde" y "Hasta") y "¿Para cuándo?". No pide teléfono.
- No se pregunta la ayuda para cargar, ni al cliente ni al transportista
  (Yohany, 20 de octubre de 2026): es un detalle más que hablan por teléfono,
  como el precio, y en el MVP solo era ruido. No filtra el emparejamiento.
  La columna `labor` se quitó en la limpieza.
- El botón dice "Buscar conductor" (el texto del diseño; antes "Solicitar
  transportista"). Igual que antes, si en ese momento no hay nadie, la
  solicitud queda guardada para cuando aparezca uno (Yohany, octubre de
  2026). La pantalla está en `/solicitar`; `/cotizar` lleva ahí.

**Una solicitud a la vez**
- Como el transportista, el cliente tiene una sola solicitud abierta. Si
  vuelve a `/solicitar`, ve "Su solicitud" con los conductores que le
  sirven en ese momento, en vez del formulario. Arriba, como una guía de
  envío, están "Desde", "Hasta", "Servicio" y "Cuándo".
- Es una pantalla de espera (Yohany, octubre de 2026): mientras no hay
  conductores sale "Buscando conductores..." con ondas que salen del
  centro, como una señal (`animate-signal` en `globals.css`, detrás del
  símbolo; quietas si el teléfono pide menos movimiento). Con
  conductores, la lista se titula "1 conductor va para allá" (o "3
  conductores van para allá"), dice "Llame o escriba y acuerden el precio." y
  debajo sigue "Seguimos buscando conductores. Vuelva a mirar más tarde."
  con un punto que late. Al tocar "Buscar conductor" sale primero, por lo
  menos 1,4 segundos, "Buscando conductores" con el símbolo y la ruta.
- "Ya no necesito el servicio", la última fila de "Su solicitud", la cierra:
  pide confirmar en una hoja ("¿Cerrar su solicitud?", con el sí en rojo) y
  vuelve al inicio con el aviso "Listo. Cerramos su solicitud." (`Toast` en
  el layout, `announce` en `src/lib/toast.ts`; Yohany, 27 de octubre de 2026).
  "Cambiar", arriba en "Su solicitud", devuelve el formulario; al enviarla,
  la nueva reemplaza la de antes. Para regresar sin cambiarla están "← Volver" y la
  flecha de atrás del teléfono, que no lo saca de Rumbox (Yohany, 28 de
  octubre de 2026). Las hojas de abajo también se cierran con esa flecha.
- Vale hasta que termina el día del viaje: después se olvida y vuelve el
  formulario. La de "Cualquier día" no se vence.

**Una cosa a la vez en cada teléfono**
- Un teléfono tiene una sola cosa abierta: una solicitud o un viaje como
  transportista, nunca las dos (Yohany, octubre de 2026).
- Mientras la tenga, Rumbox lo lleva siempre a esa pantalla: el inicio y la
  pantalla del otro papel no se ven, y "← Inicio" no sale (`GoToActive` y
  `BackHome` en `src/components/one-at-a-time.tsx`). Desde ahí no podría hacer
  nada. Cuando la cierra ("Ya no necesito el servicio" o "Ya no estoy
  disponible"), vuelve al inicio; si se vence, vuelven el formulario y "←
  Inicio".
- Lo revisa solo el navegador, con lo que guarda. Antes el servidor lo
  cruzaba por número, pero el cliente ya no da el suyo (Yohany, 23 de octubre
  de 2026).

**Las listas se actualizan solas**
- Los transportistas que le sirven al cliente, y si la disponibilidad del
  transportista sigue encendida, se vuelven a pedir al volver a la app y cada
  minuto mientras la pantalla se ve (`refreshWhileOpen`). Si falla una de esas
  consultas que se hacen solas, no se muestra el aviso de señal.
- Además, la lista del cliente se pone al día sola con Supabase Realtime: un
  trigger de la base manda un mensaje vacío al canal privado
  `transportistas-cualquier_dia` (y al del día, `transportistas-AAAA-MM-DD`,
  de antes) cuando un transportista se pone disponible o cambia la suya, y la
  pantalla vuelve a pedir su lista al servidor. Escucha el de todos los días
  porque un transportista le sirve desde su día en adelante. El mensaje no lleva teléfonos ni ciudades. Con la anon key solo
  se puede escuchar ese canal; escribir en él, solo la base de datos.

**Límites sin cuenta**
- Para que nadie junte los teléfonos de los transportistas haciendo muchas
  solicitudes, el cliente puede hacer hasta 20 por hora desde una misma
  conexión (Yohany, octubre de 2026). Ya no hay límite por teléfono porque no
  se le pide (Yohany, 23 de octubre de 2026).
- Para que nadie llene la app de transportistas falsos (con el número de otra
  persona) que les salen a los clientes, el transportista
  puede ponerse disponible hasta 3 veces por hora desde un mismo teléfono y
  10 desde una misma conexión (Yohany, octubre de 2026).
- Los límites están en `src/lib/rate-limit.ts`. De la conexión solo se guarda
  una huella (`ip_hash`), nunca la IP.

**Consejos de seguridad**
- Yohany, 23 de octubre de 2026, tras revisar los fraudes posibles: "Para
  cuidarse" con consejos cortos debajo de los datos del transportista, y
  "Rumbox nunca le cobra ni le escribe" también en el inicio y en la hoja
  antes de contactar. Los del cliente salen solo antes del primer contacto
  de cada visita (ver "Llamada o WhatsApp"): Yohany quitó "Para cuidarse" de
  "Su solicitud", que solo tiene el enlace "Qué hacer si lo estafan". Los
  textos están en `src/lib/safety.ts`.
- `/ayuda` (Yohany, 23 de octubre de 2026) es solo de fraudes y seguridad,
  no de cómo usar la app (Yohany quitó "Cómo funciona" y las preguntas). Tiene
  qué acordar por WhatsApp antes del trasteo y lo que se puede hacer si hubo
  fraude: el 123 si está en peligro; si pagó, avisar ya al banco,
  Nequi o Daviplata, guardar pantallazos y denunciar en ADenunciar o el CAI
  Virtual de la Policía; consejos para el transportista; y que Rumbox no
  cobra. Se llega desde "Qué hacer si lo estafan" (en "Su solicitud" y en
  "Para cuidarse" del transportista) y desde
  "Ayuda" en el pie del inicio. Su "← Volver" lleva a lo que el teléfono tiene
  abierto (`BackLink`), porque desde ahí no se puede volver al inicio.
- No hay botón para reportar (Yohany, 23 de octubre de 2026): sin alguien
  que atienda los casos, un reporte solo serviría para estadística y deja a
  la persona con un sinsabor. Vuelve cuando haya quién responda.

**Los teléfonos se borran**
- El teléfono (del transportista, y de las solicitudes de antes) se guarda solo mientras la solicitud o la disponibilidad vale
  (Yohany, octubre de 2026); como la disponibilidad y la solicitud de
  "Cualquier día" no se vencen, eso es hasta que se apagan o se cierran
  (`0015_cualquier_dia_sin_vencer.sql`). Cada hora, `borrar_telefonos_vencidos()`
  (pg_cron, migraciones `0009_borrar_telefonos.sql` y
  `0011_vence_al_terminar_el_dia.sql` y `0014_sin_te_encontraron.sql`) borra el
  teléfono y el `ip_hash` de las vencidas, y de las cerradas o apagadas una
  hora después de creadas (para que el límite las siga contando). Por eso `whatsapp` puede quedar vacía, y una disponibilidad
  apagada no se vuelve a encender.

**Privacidad y términos**
- Encima de "Buscar conductor" y de "Ponerme disponible" va el permiso
  para guardar los datos (`PrivacyNote` en `src/components/ui.tsx`), con el
  enlace "Cómo cuidamos sus datos" a `/privacidad`, que también sale en el
  inicio.
- El responsable y su contacto están en `src/lib/legal.ts`. El correo
  `ayuda@rumbox.co` (todavía no existe) y el teléfono `300 111 2233` son de prueba, solo para el
  demo (Yohany, octubre de 2026): se cambian antes de abrir al público.
- Los términos y condiciones entran en el MVP (Yohany, octubre de 2026).
  Están en `/terminos`, en borrador (28 de octubre de 2026): falta que alguien
  que conozca la ley los revise y los datos reales del responsable. La nota
  de `PrivacyNote` dice "Al continuar acepta los términos y condiciones".
- Google no muestra Rumbox (`noindex`) mientras dure el demo (Yohany, 28 de
  octubre de 2026): `OPEN_TO_SEARCH` en `src/lib/site.ts` pasa a `true` el
  día que se abra al público, con el contacto real puesto. El dominio
  (`SITE_URL`) también está ahí.

**Sin avisos al celular**
- No hay avisos al celular (Yohany, 22 de octubre de 2026): en iPhone había
  que agregar Rumbox a la pantalla de inicio para recibirlos y era muy
  complicado. El cliente entra a "Su solicitud" cada tanto, y la pantalla se
  lo dice ("Entre a Rumbox cada tanto para mirar."). Con la pantalla
  abierta, la lista se pone al día sola. Antes había "Sí, avísame" con Web
  Push (VAPID); la tabla `push_subscriptions` se borró en
  `0018_sin_avisos_al_celular.sql`. El service worker se queda, para que la
  app abra con mala señal.
- El transportista tampoco recibe avisos.

**Analíticas propias**
- Yohany pidió analíticas en octubre de 2026. Son propias, en la tabla
  `events` de Supabase.
- Se cuentan las visitas al inicio, `/solicitar`, `/transportista` y
  `/privacidad` (`TrackVisit`; `/ayuda` y `/terminos` no), si ese navegador ya
  había entrado (`muvia.ya-vino` en localStorage) y los toques en "Escribir por
  WhatsApp" y "Llamar" de `ContactButtons`, con el transportista que se tocó.
- No se guarda nada de la persona: ni teléfono, ni `ip_hash`, ni un
  identificador del navegador. `/privacidad` lo dice.
- Yohany ve los números en Supabase, en las vistas `analiticas_por_dia` y
  `analiticas_por_municipio`. No hay pantalla de estadísticas en la app.
- Además está Vercel Web Analytics, en su plan gratis (`<Analytics />` en
  `src/app/layout.tsx`): visitas, país, celular y de qué página llegan, sin
  cookies. Los toques se cuentan en la tabla propia, no con eventos de
  Vercel, porque esos son de pago. Nada de Google Analytics: usa cookies.

**Sin precio**
- En el MVP no se calcula ningún precio: el cliente y el transportista lo
  acuerdan cuando hablan. Yohany lo decidió en octubre de 2026: la carga no
  se mide con precisión (y desde el 28 de octubre ni siquiera se pregunta su
  tamaño), así que cualquier cálculo sería poco preciso. Tampoco hay
  descuento por ruta.
- El cliente busca conductor ("Buscar conductor") y la pantalla le dice
  "Llame o escriba y acuerden el precio." El transportista sabe qué lleva el
  cliente cuando hablan; si hace falta ayuda para cargar, lo hablan ahí.
- No se preguntan las escaleras: solo servían para el precio. Las columnas
  `stairs_origin`, `stairs_destination` y `estimated_price` se quitaron en la
  limpieza.

**Limpieza de la base** (Yohany, 29 de octubre de 2026)
- La migración `0022_limpieza.sql` (ya corrida en Supabase, como todas
  hasta esa) quitó lo que ya no usaba nadie: la tabla
  `reviews` (las reseñas automáticas están fuera del MVP; se crea de nuevo
  cuando lleguen), de `availabilities` las columnas `time_slot`,
  `vehicle_type`, `labor`, `photo_url`, `space` y `full_space`, de
  `requests` las columnas `whatsapp`, `labor`, `stairs_origin`,
  `stairs_destination`, `estimated_price`, `time_slot` y `volume`, y los
  índices `requests_search_idx` y `availabilities_ruta_idx`. Antes apagó lo
  de antes que ya no salía (sin destino o en carro particular).
- Las columnas que ya no se usan se quitan con una migración, en vez de
  dejarlas "para lo guardado antes". Hoy la base tiene tres tablas
  (`availabilities`, `requests` y `events`), dos vistas de analíticas, el
  trigger de Realtime y la tarea de pg_cron que borra los teléfonos. El
  reporte del modelo para revisar con un experto está en la carpeta del
  proyecto (`base-de-datos/`) y en
  https://claude.ai/artifact/6Q93wAYpBa9krmv5ctoUEG.

**Fuera del MVP** (ver docs/MVP.md): carros particulares, encargos y
diligencias, precio aproximado,
fotos, API oficial de WhatsApp, avisos al celular, reseñas automáticas,
formularios offline, monetización (incluidas las disponibilidades
programadas), autocompletado de direcciones, captcha y verificar el número
con un código por SMS.
