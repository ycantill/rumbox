@AGENTS.md

# Muvia · guía para Claude

Muvia es una PWA de mudanzas, fletes y envíos en Colombia; todavía no está
definido dónde será el piloto, así que no favorezcas ninguna región. Conecta
clientes con transportistas que ya van hacia otro lado y tienen espacio libre.
Sin registro, sin comisiones y con contacto directo por llamada o WhatsApp. El
alcance del MVP está en [docs/MVP.md](docs/MVP.md) y la visión de negocio
completa (modelo, precios, emparejamiento, monetización, roadmap) en
docs/negocio/. Léelos antes de proponer funciones
nuevas. Si el documento de negocio y las decisiones de abajo no coinciden,
mandan las decisiones de abajo. Lo que falta por decidir o construir está en
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
src/app/solicitar/               Cliente: formulario para solicitar transportista
src/app/transportista/           Transportista: ponerse disponible y ver su servicio
src/app/actions.ts               Server Actions (publishAvailability, updateAvailability,
                                 getMyAvailability, createRequest, getMyRequest,
                                 closeRequest)
src/components/ui.tsx            Componentes compartidos y useBogotaDates
src/lib/domain.ts                Vocabulario: tamaños de carga, mano de obra
src/lib/matching.ts              Emparejamiento por ruta
src/lib/cities.ts                Todos los municipios de Colombia (DIVIPOLA) y su búsqueda
src/lib/local-store.ts           Datos que recuerda el navegador (localStorage)
src/lib/refresh.ts               Volver a pedir las listas al regresar a la app y cada minuto
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

**Audiencia y tono**
- La app es para personas que no manejan mucho el celular. Textos cortos, que
  suenen a una persona hablando, y preguntas simples ("¿Desde dónde?",
  "¿Hacia dónde?", "¿Cuánto puedes llevar?").
- Nada de jerga técnica en pantalla: no "cotizar", "ruta programada", "mano de
  obra", "tarifa", "GPS", "Modo Ruta", "local", "zona" ni distancias en km.
- Los errores usan el mismo tono, por ejemplo "Elige si ayudas a cargar".

**Sin cuentas**
- No hay login ni contraseñas ("Cero registros"). El número de teléfono
  identifica cada disponibilidad.
- El transportista controla su disponibilidad con un token que vive en su
  teléfono (localStorage); en la base solo se guarda el hash. Por eso "uno a la
  vez" vale por teléfono. El cliente controla su solicitud igual, con su
  propio token; las solicitudes de antes no tienen token y no las controla
  nadie.

**Llamada o WhatsApp**
- Se pide "Tu teléfono", no "Tu WhatsApp": el número sirve para llamar y para
  escribir por WhatsApp. Al transportista se le dice que los clientes lo
  pueden llamar o escribir por WhatsApp, y al cliente, que el transportista lo
  llama o le escribe por WhatsApp.
- Cada tarjeta para contactar (los transportistas en los resultados del
  cliente y los clientes que esperan al transportista) tiene "Escribir por
  WhatsApp", un enlace `wa.me` con el mensaje listo, y "Llamar", un enlace
  `tel:`. Los dos salen de `ContactButtons` en `src/components/ui.tsx`.
- La columna `whatsapp` de la base y los campos que guarda el navegador
  conservan ese nombre aunque guardan el teléfono: no se renombran.

**El transportista se pone disponible, no publica**
- En el sistema cada registro es una publicación (`availabilities`), pero en la
  pantalla del transportista nunca se habla de publicar: él "se pone
  disponible".
- No repitas la palabra "disponible". Solo aparece en el botón "Ponerme
  disponible" y en el título "Estás disponible para este servicio".
- No le prometas clientes: nada de "Estás recibiendo clientes".

**Un viaje a la vez**
- El transportista siempre va de viaje: el formulario pregunta "¿Dónde
  estás?", "¿Hacia dónde vas?" y "¿Qué día viajas?". El destino es
  obligatorio; no hay modo local (Yohany lo quitó en octubre de 2026). Debajo
  del destino puede elegir "Cualquier destino" (Yohany, octubre de 2026), que
  se guarda como `cualquiera` (`ANY_DESTINATION`) en `destination_city`.
- Tiene una sola disponibilidad activa. Si ya tiene una, la pantalla muestra
  "Estás disponible para este servicio" con sus datos ("Viajas…"), los
  clientes que lo esperan y al final el aviso de que lo pueden llamar o
  escribir por WhatsApp, en vez del formulario. No hay lista de varios días.
- Vale el día del viaje (`service_date`) y 24 horas más: una para mañana se
  vence pasado mañana (Yohany, octubre de 2026). Solo le salen clientes de ese
  mismo día. Cuando se vence, se apaga sola y vuelve el formulario con sus
  datos. Lo que quedó guardado sin destino, de cuando era opcional, también
  se apaga y vuelve el formulario para que elija hacia dónde va.
- Las rutas que se repiten (todos los días o todas las semanas) son una mejora
  futura para el transportista: las "disponibilidades programadas". No van
  en el MVP: quien repite una ruta registra cada viaje.
- Un solo botón para apagarla: "Ya no voy a trabajar" (también sirve si se
  llenó). Pide confirmar y luego vuelve al formulario con
  los mismos datos. También existe "Solo queda espacio para paquetes".

**Emparejamiento**
- El match es por ruta (el Modo Ruta, por debajo): clientes del día del viaje
  cuyo origen y destino quedan sobre el corredor y en el mismo sentido.
- Con "Cualquier destino" el match es por origen: clientes del día del viaje
  que salen del mismo municipio que el transportista, vayan a donde vayan. No
  se mira la cercanía: un municipio vecino no cuenta.
- Origen y destino nunca son el mismo municipio, ni para el cliente ni para
  el transportista: no hay trasteos dentro del mismo pueblo (Yohany, octubre
  de 2026). El municipio elegido en un campo no sale en la lista del otro
  (`exclude` de `CitySelect`); si lo escribe, sale "Ese municipio ya lo
  elegiste. Elige otro.". Como "Ubicarme" sí puede dejar los dos iguales,
  queda el aviso "Elige otro municipio: no puede ser el mismo de salida."
  (`SAME_CITY_ERROR`) debajo del destino: el cliente no puede continuar y el
  servidor lo rechaza. Las solicitudes así que quedaron de antes ya no le
  salen a ningún transportista.
- No hay match por cercanía (el antiguo radio de 40 km alrededor del origen)
  ni opción Local/Nacional.
- El transportista no debe ver esta lógica en la pantalla.

**El día, sin jornadas**
- Los dos eligen solo el día: "Hoy", "Mañana" u otra fecha en el calendario.
  Yohany quitó las jornadas (mañana, tarde, noche) en octubre de 2026. "Hoy"
  sale a cualquier hora.
- La columna `time_slot` queda en la base: las disponibilidades nuevas guardan
  `todo_el_dia` (la columna no puede quedar vacía) y las solicitudes nuevas la
  dejan vacía. El emparejamiento ya no la mira.

**Carga por tamaño de casa**
- La carga se mide por tamaño de casa, con cuatro opciones: "Paquetes o
  sobres", "Algunas cosas", "Una habitación o apartaestudio" y "Una casa de 2
  habitaciones o más", cada una con una pista corta de lo que incluye.
- Es la misma lista para los dos: el cliente responde "¿Qué vas a mover?" y el
  transportista "¿Cuánto puedes llevar?". Al transportista le salen los
  clientes cuya carga es igual o más chica que la suya.
- No se pregunta el vehículo (Yohany lo quitó en octubre de 2026): importa
  cuánto puede llevar, no en qué. La columna `vehicle_type` queda en la base
  para lo guardado antes y lo nuevo la deja vacía.
- Las claves vienen de cuando se medía en camiones y no se cambian: el cliente
  guarda `sobres`, `carga_parcial`, `medio_camion` y `camion_entero`, y el
  transportista lo mismo, salvo `solo_paquetes` en vez de `sobres`.
- El carro particular (con "Espacio en el baúl" y "Asientos traseros libres")
  salió del MVP en octubre de 2026 y queda anotado para después en
  [docs/MVP.md](docs/MVP.md). Sus claves (`carro`, `baul`, `asientos`) siguen
  permitidas en la base; lo que quedó guardado con carro ya no les sale a los
  clientes y al transportista le vuelve el formulario.

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
- El campo vacío dice "Escribe o elige", para invitar a las dos formas. Es
  corto a propósito: con "Ubicarme" al lado, un texto más largo no cabe en un
  celular de 360 px.
- El origen de las dos pantallas ("¿Dónde estás?" del transportista y
  "¿Desde dónde?" del cliente) tiene el botón "Ubicarme", que elige el
  municipio más cercano según la ubicación del teléfono (`OriginCitySelect`).
- Los slugs se guardan en la base de datos: no se cambian.

**El cliente llena una sola pantalla**
- El formulario del cliente es casi igual al del transportista: todo en una
  pantalla, sin pasos, con las mismas preguntas en el mismo orden ("¿Desde
  dónde?", "¿Hacia dónde?", "¿Qué día?", "¿Qué vas a mover?",
  "¿Necesitas ayuda para cargar?" y "Tu teléfono"). Yohany lo pidió en
  octubre de 2026.
- Con paquetes o sobres no sale "¿Necesitas ayuda para cargar?".
- El botón dice "Solicitar transportista", no "Buscar": si en ese momento no
  hay nadie, la solicitud queda guardada para cuando aparezca uno (Yohany,
  octubre de 2026). Por eso la pantalla está en `/solicitar`; `/cotizar`
  lleva ahí.

**Una solicitud a la vez**
- Como el transportista, el cliente tiene una sola solicitud abierta. Si
  vuelve a `/solicitar`, ve "Tu solicitud" con los transportistas que le
  sirven en ese momento, en vez del formulario.
- "Ya conseguí transportista" la cierra (pide confirmar: "¿Dejamos de mostrar
  tu solicitud a los transportistas?") y vuelve el formulario con los mismos
  datos. "Hacer otra solicitud" devuelve el formulario; al enviarla, la nueva
  reemplaza la de antes.
- Vale el día del viaje y 24 horas más, como la del transportista: después se
  olvida y vuelve el formulario.

**Las listas se actualizan solas**
- Los clientes que esperan al transportista y los transportistas que le
  sirven al cliente se vuelven a pedir al volver a la app y cada minuto
  mientras la pantalla se ve (`refreshWhileOpen`). Si falla una de esas
  consultas que se hacen solas, no se muestra el aviso de señal.
- No hay notificaciones: el aviso por WhatsApp al transportista necesita la
  API oficial y está fuera del MVP.

**Sin precio**
- En el MVP no se calcula ningún precio: el cliente y el transportista lo
  acuerdan cuando hablan. Yohany lo decidió en octubre de 2026, porque medir
  la carga por tamaño de casa hace menos preciso cualquier cálculo. Tampoco
  hay descuento por ruta.
- El cliente solicita transportista ("Solicitar transportista") y la
  pantalla le dice que acuerden el precio. Al transportista, en la lista de clientes que
  esperan, le sale la ayuda que pide cada uno (`CLIENT_LABOR_FOR_DRIVER`) para
  que sepa qué cobrar.
- No se preguntan las escaleras: solo servían para el precio. Las columnas
  `stairs_origin` y `stairs_destination` quedan en 0 y `estimated_price` queda
  vacía en las solicitudes nuevas.

**Fuera del MVP** (ver docs/MVP.md): carros particulares, precio aproximado,
fotos, API oficial de WhatsApp y notificaciones, reseñas automáticas,
formularios offline, monetización (incluidas las disponibilidades
programadas), autocompletado de direcciones y anti-spam.
