# Mudavía · Pendientes

Lo que falta por decidir o construir en el MVP, por orden de importancia.
Actualizado el 18 de octubre de 2026. Los números son los de la revisión de
ese día; cuando algo se termine, pásalo a [Hecho](#hecho) con su PR.

## Decisiones de Yohany

### 10. Datos de verdad en el aviso de privacidad

- **Problema:** el aviso de privacidad y la página `/privacidad` ya existen,
  pero con datos de prueba para el demo (Yohany, 20 de octubre de 2026): el
  correo `ayuda@mudavia.co` y el teléfono `300 111 2233`, que no es real. El
  Decreto 1377 de 2013 pide el nombre (o razón social), domicilio,
  dirección, correo y teléfono del responsable, y alguien tiene que responder
  ahí (10 días hábiles para preguntas, 15 para reclamos).
- **Falta antes de abrir al público:** el nombre del responsable (persona o
  empresa), su dirección, y un correo y un teléfono reales. Se cambian en
  `src/lib/legal.ts`. Conviene que alguien que conozca la ley revise el texto.

### 10b. Términos y condiciones

- **Decisión:** entran en el MVP (Yohany, 20 de octubre de 2026).
- **Falta:** escribirlos y enlazarlos junto al aviso de privacidad. Deberían
  decir, por lo menos, que Mudavía solo conecta a las personas, que el precio y
  el servicio los acuerdan el cliente y el transportista, que Mudavía no
  responde por la carga ni por el viaje, y qué está prohibido (números
  ajenos, datos falsos). Necesitan los mismos datos del responsable que el
  punto 10.

### 10c. Aparecer en Google (SEO)

- **Decisión:** entra en el MVP, pero queda en espera (Yohany, 20 de octubre
  de 2026).
- **Hoy:** cada pantalla tiene título, el idioma es español y hay una
  descripción general en `src/app/layout.tsx`, que todavía dice "Mira cuánto
  cuesta tu mudanza" (ya no hay precio; también en `src/app/manifest.ts`).
  No hay mapa del sitio, ni `robots`, ni dirección oficial (`metadataBase`),
  ni imagen y texto para cuando el enlace se comparte por WhatsApp o
  Facebook.
- **Plan, en tres pasos:**
  1. Base técnica: `sitemap.ts`, `robots.ts`, la dirección oficial en un solo
     lugar, una descripción para cada pantalla, la imagen para compartir y
     quitar "cuánto cuesta". Mientras dure el demo, pedirle a Google que no
     la muestre (`noindex`) y prenderlo al abrir al público, porque hoy
     tiene el contacto de prueba (10) y no tiene términos (10b).
  2. Registrar la app en Google Search Console (Yohany). Conviene tener antes
     el dominio definitivo: cambiarlo después hace que Google tarde semanas
     en pasar lo ganado a la nueva dirección.
  3. Una página por ciudad ("Trasteos en Montería", "Fletes de Cali a Buga"),
     con la palabra "trasteo", que es como se busca en Colombia, y un botón a
     "Necesito mover algo". Empezar con las ciudades principales, sin
     favorecer ninguna región.
- **Dominio:** la app se llama Mudavía (Yohany, 21 de octubre de 2026,
  porque muvia.co ya tenía dueño). mudavia.co y mudavia.com.co estaban
  libres ese día; falta comprarlos y revisar la marca en la SIC.
- **Falta decidir:** cuándo se retoma.

## Propuestas

### 18. Compartir por WhatsApp o con código QR

Un botón en el inicio para compartir el enlace de la app, y un código QR para
carteles. Apoya la Fase 1 del roadmap: grupos de
Facebook y WhatsApp.

### 19. Reintento automático cuando vuelve la señal

Next.js 16.4 trae `experimental.useOffline`: si se cae la señal, el envío
queda en espera y se manda solo cuando vuelve, y el hook `useOffline` permite
avisar "sin señal". Hoy la app muestra "No pudimos conectarnos. Revisa tu
señal e intenta otra vez." y la persona vuelve a tocar. Riesgos: es
experimental, y si el envío llegó pero se perdió la respuesta, podría
guardarse dos veces (las listas ya no muestran repetidos).

## Por probar en un celular

Lo construido en octubre de 2026 pasó lint, typecheck, pruebas y build, pero no
se probó en un teléfono:

- Con "Tu solicitud" abierta, un transportista que le sirve se pone disponible
  en otro teléfono: aparece en la lista en un par de segundos, sin esperar el
  minuto.

- El transportista está disponible y un cliente solicita después: al volver
  a la app (o al minuto, con la pantalla abierta), el cliente le sale en la
  lista sin tener que recargar.
- El cliente solicita y cierra la app. Al abrir otra vez `/solicitar` ve "Tu
  solicitud" con los transportistas de ese momento, no el formulario.
- "Ya no necesito este servicio" pide confirmar, vuelve el formulario con los
  mismos datos y el cliente ya no le sale a ningún transportista.
- "Cambiar mi solicitud" y enviarla cambiando el día: al transportista del
  día de antes ya no le sale ese cliente.
- El día del viaje, "Tu solicitud" y "Estás disponible para este servicio"
  se ven hasta la medianoche; al día siguiente vuelve el formulario con los
  datos de antes, sin el día.

- Con la llave de OpenRouteService puesta en Vercel, ponerse disponible de
  Bogotá a Cartagena: la lista de "¿Por dónde vas?" muestra pueblos de la carretera
  (Honda o Puerto Salgar, Aguachica, Bosconia…), no Pacho ni Puerto Berrío.
- "Comienza tu viaje" en Android (abre Google Maps) y en iPhone (abre
  Mapas): abre el camino hasta el destino, y al volver a Mudavía dice
  "Continúa tu viaje".
- Instalar la app en Android y en iPhone y ver el logo de Mudavía.
- Con el modo avión, tocar "Solicitar transportista" o "Ponerme disponible": debe
  salir el aviso de señal sin perder lo llenado.
- El cliente no ve ningún precio ni le preguntan por escaleras. Al final ve
  "Llama o escribe por WhatsApp y acuerden el precio", o "Guardamos tu
  solicitud" si no hay transportistas.
- El cliente llena todo en una sola pantalla, como el transportista. Ninguno
  de los dos ve la pregunta de la ayuda para cargar.
- Ninguna de las dos pantallas pregunta la jornada: solo "Hoy", "Mañana" u
  otra fecha. "Hoy" sale también de noche.
- "Cambiar mi solicitud" devuelve el formulario con lo que había llenado.
- Abrir un enlace viejo a `/cotizar`: debe llevar a `/solicitar`. También con
  la app instalada.
- Los campos de municipio vacíos dicen "Escribe o elige" y el texto se ve
  entero.
- El municipio elegido en un campo no sale en la lista del otro, y si lo
  escribe sale "Ese municipio ya lo elegiste. Elige otro." (se probó en el
  navegador del computador).
- Sin elegir hacia dónde va, no deja ponerse disponible.
- "Cualquier destino" sale de primero al tocar la flecha del destino y al
  escribir "cual"; al elegirlo, el campo lo muestra. La tarjeta dice "… → Cualquier destino", le salen los
  clientes que salen de su municipio o de uno cercano y al cliente le sale "Va de … a
  cualquier destino".
- Un viaje: la pregunta "¿Qué día viajas?" y la tarjeta "Viajas…".
- Un teléfono que tenía guardada una disponibilidad sin destino, de antes: al
  abrir la pantalla vuelve el formulario con sus datos para elegir el destino.
- Tocar "Llamar" en un transportista: debe abrir el marcador con el número.
- El transportista ya no ve "Clientes buscando transportista" ni nada de los
  clientes; un cliente que solicita después lo ve en su lista y lo llama.
- Un teléfono que tenía guardado un carro particular: si estaba disponible,
  vuelve el formulario con sus datos y sin elegir cuánto puede llevar.
- El transportista ya no ve "¿Qué vehículo tienes?": elige en "¿Cuánto puedes
  llevar?" entre los cuatro tamaños, y su tarjeta dice "Puedes llevar…".
- Un transportista que puede llevar "Algunas cosas" le sale a un cliente que
  mueve algunas cosas, pero no a uno que mueve una habitación.
- Tocar "Ponerme disponible" o "Solicitar transportista" sin llenar nada: sale
  el mensaje de Mudavía de lo primero que falta, no el globito del navegador.
- Abrir la app un día después de que se venció el viaje o la solicitud: vuelve
  el formulario con "Tu viaje anterior ya pasó…" o "Tu solicitud anterior ya
  pasó…".
- Bajar "¿Cuánto espacio te queda?" y luego "Ya no estoy disponible": el
  formulario vuelve con lo que podía llevar al empezar, no con lo que le
  quedaba.
- Abrir una dirección que no existe: sale "No encontramos esta página".

## Menores

- **Service worker:** `public/sw.js` guarda una copia de todo lo que se pide
  (páginas y archivos de cada versión) y nunca borra nada, porque el nombre del
  caché (`muvia-v1`) no cambia. El espacio que ocupa en el teléfono crece con
  cada despliegue.

## Para después del MVP

- **Disponibilidades programadas:** rutas que el transportista repite todos
  los días o todas las semanas. Es una mejora futura
- **Carros particulares:** paquetes y sobres en el baúl o los asientos
  traseros. Salieron del MVP en octubre de 2026; lo que había está anotado en
  "Qué queda para después" de [MVP.md](MVP.md).
- El resto está en "Qué queda para después" de [MVP.md](MVP.md).

## Hecho

- **PR #11:** la pantalla ya no se rompe sin señal (1); WhatsApp con un dígito
  de más se rechaza y se muestra cómo quedó (2); nadie sale repetido (3); los
  30 municipios de Córdoba y los 26 de Sucre (11).
- **PR #12:** sin km en pantalla (13); la lista se actualiza tras "Solo queda
  espacio para paquetes" (4); con sobres no se preguntan escaleras (5); el
  error del servidor ya no le habla de "solicitud" al transportista (6); aviso
  cuando "Ubicarme" falla (14); íconos PNG para instalar la app (12).
- **PR #13:** un viaje con destino vale solo su día (7); las rutas que se
  repiten quedan anotadas como mejora futura.
- **PR #15:** sin destino, la disponibilidad dura una semana y se renueva
  (15); el botón de la tarjeta activa dice "Ya no voy a trabajar"; esta lista
  de pendientes.
- **PR #16:** todos los municipios de Colombia, con buscador; en el cotizador
  ya no sale "Hoy" dos veces; la región del piloto queda sin definir.
- **PR #17:** además de buscar, la flecha despliega la lista completa de
  municipios, agrupada por departamento.
- **PR #18:** sin modo local. El transportista siempre dice
  hacia dónde va y el match es solo por ruta; se quitan el radio de 40 km, la
  semana y "Renovar una semana más". Con eso "Todo el día" para hoy (8) ya no
  aplica: un viaje vale un solo día.
- **PR #19 y #20:** se pide "Tu teléfono" en vez de "Tu
  WhatsApp", y cada tarjeta tiene "Escribir por WhatsApp" y "Llamar". El carro
  particular sale del MVP y queda anotado para después. La carga se mide por
  tamaño de casa, con la misma lista para el cliente y el transportista, y ya
  no se pregunta el vehículo (requiere la migración `0002_carga_por_tamano.sql`).
  No se calcula precio: lo acuerdan al hablar, sin descuento por ruta ni
  escaleras, y con eso el precio distinto que veían el cliente y el
  transportista (9) ya no aplica (requiere la migración `0003_sin_precio.sql`).
  Los campos de municipio dicen "Escribe o elige", y el cliente también tiene
  "Ubicarme". Origen y destino ya no pueden ser el mismo municipio, tampoco
  para el cliente: el elegido en un campo no sale en la lista del otro. No hay
  trasteos dentro del mismo pueblo, y con eso se cierra (9).
- **PR #21:** el cliente llena todo en una sola
  pantalla, casi igual a la del transportista, y también elige la jornada:
  solo se emparejan cliente y transportista de la misma jornada, y "Todo el
  día" coincide con todas (requiere la migración
  `0004_jornada_del_cliente.sql`). La pantalla pasa a `/solicitar` (`/cotizar`
  lleva ahí) y el botón dice "Solicitar transportista".
- **PR #22:** botón "Ya conseguí
  transportista" para el cliente (16): una solicitud a la vez, controlada con
  un token en su teléfono; al volver a `/solicitar` ve su solicitud con los
  transportistas del momento, y "Hacer otra solicitud" reemplaza la de antes
  (requiere la migración `0005_cerrar_solicitud.sql`). Las listas del
  transportista y del cliente se actualizan al volver a la app y cada minuto.
- **PR #23:** sin jornadas en las dos pantallas,
  solo el día; las solicitudes y disponibilidades valen el día del servicio y
  24 horas más (una para mañana se vence pasado mañana). El emparejamiento
  sigue siendo del mismo día. No necesita migración.
- **PR #24:** "Cualquier destino" para el transportista: le salen los clientes
  del día que salen de su municipio o de uno cercano, vayan a donde vayan. No necesita
  migración.
- **PR #25:** el transportista ya no ve a los clientes que lo esperan, ni su
  número, por la privacidad del cliente: siempre es el cliente quien llama o
  escribe. No necesita migración.
- **PR #27:** "Cualquier destino" pasa a ser la primera opción de la lista del
  destino, en vez de un botón aparte. No necesita migración.
- **PR #28:** la lista del cliente se actualiza sola con Supabase Realtime, y
  al cliente le llega un aviso al celular (Web Push) cuando aparece un
  transportista que le sirve. Requiere la migración `0006_avisos.sql`, las
  llaves VAPID y las variables de `.env.example` en Vercel.
- **Revisión de datos (20 de octubre de 2026):** límite de solicitudes del
  cliente (5 por hora por teléfono y 20 por conexión) para que nadie junte los
  teléfonos de los transportistas, y el canal de Realtime pasa a ser privado:
  solo se puede escuchar. Requiere la migración `0007_proteger_datos.sql`.
- **Revisión de seguridad (20 de octubre de 2026, segunda parte):** límite
  para el transportista (3 por hora por teléfono y 10 por conexión), los
  avisos solo se mandan a los servicios de avisos de los navegadores, y
  cabeceras para que ninguna otra página meta Mudavía dentro de la suya.
  Requiere la migración `0008_limite_transportista.sql`.
- **Teléfonos solo mientras valen (20 de octubre de 2026):** el teléfono y la
  huella de la conexión se borran cuando la solicitud o la disponibilidad deja
  de valer, cada hora con pg_cron. Requiere activar pg_cron y la migración
  `0009_borrar_telefonos.sql`. El aviso de privacidad (10) sigue pendiente.
- **PR #33, analíticas (20 de octubre de 2026):** se cuentan las visitas a cada
  pantalla, si quien entra ya había venido antes, y los toques en "Escribir
  por WhatsApp" y "Llamar" (17), sin guardar nada de la persona. Los números
  se ven en Supabase, en las vistas `analiticas_por_dia` y
  `analiticas_por_municipio`. Requiere la migración `0010_analiticas.sql`.
  También Vercel Web Analytics (gratis), que hay que activar en el panel de
  Vercel.
- **PR #36:** una cosa a la vez en cada teléfono: o es transportista o pide
  uno. Con algo abierto, Mudavía lo lleva siempre a esa pantalla (sin inicio ni
  la pantalla del otro papel), y el servidor lo revisa con el número. No
  necesita migración.
- **PR #37:** "Tu solicitud" muestra la ruta, el día, qué va a mover y la
  ayuda que pidió. Los botones dicen "Ya no necesito este servicio" y
  "Cambiar mi solicitud". Es una pantalla de espera: "Buscando
  transportistas…" con una animación de radar, y la invitación a los avisos
  va dentro de esa tarjeta. No necesita migración.
- **PR #38:** las solicitudes y las disponibilidades valen hasta que termina el
  día del viaje, a la medianoche en hora de Colombia, y no 24 horas más.
  La migración `0011_vence_al_terminar_el_dia.sql`, que hace que los
  teléfonos se borren desde el día siguiente al viaje, ya se corrió en
  Supabase (Yohany, 20 de octubre de 2026).
- **"Te encontraron" (20 de octubre de 2026):** el transportista ve a los
  clientes que tocaron su tarjeta, con los dos últimos números del teléfono,
  y contesta "Lo llevo" o "No lo llevo". Con "Lo llevo", Mudavía le resta el
  espacio con puntos, y se quita "Solo queda espacio para paquetes". Requiere la
  migración `0012_te_encontraron.sql`.
- **Sin ayuda para cargar (20 de octubre de 2026):** ni el cliente ni el
  transportista la eligen; la hablan por teléfono. Ya no filtra el
  emparejamiento. Requiere la migración `0013_sin_ayuda_para_cargar.sql`.
- **"¿Cuánto espacio te queda?" (21 de octubre de 2026):** se quita "Te
  encontraron" (la lista de clientes con "Lo llevo"). El transportista cambia
  lo que le queda en una lista desplegable. Requiere la migración
  `0014_sin_te_encontraron.sql`.
- **PR #48:** la ruta por carretera (20): OpenRouteService al ponerse
  disponible, guardada en `route` (migración 0017); los pueblos de "¿Por
  dónde vas?" y el match siguen la carretera, con la línea recta de respaldo.
- **PR #50, más simple (22 de octubre de 2026):** sin "Ubicarme" en las dos
  pantallas y sin avisos al celular (en iPhone eran muy complicados): el
  cliente entra cada tanto a mirar "Tu solicitud". "¿Por dónde vas?" se
  elige a mano en una lista desplegable, sin la ubicación del teléfono. Migración 0018 borra
  `push_subscriptions`.
- **"¿Por cuál camino vas?" (22 de octubre de 2026):** además del camino
  más rápido se piden otros, pasando por pueblos de cruce, y el
  transportista escoge por cuál va. Requiere la migración
  `0019_varios_caminos.sql`.
- **"¿Por dónde vas?" sigue al camino escogido (22 de octubre de 2026):** al
  escoger "Por Manizales", Manizales sale en la lista; en cada tramo va
  primero un pueblo de cruce. Sin migración.
- **Todos los pueblos de la carretera (22 de octubre de 2026):** "¿Por
  dónde vas?" muestra todos los pueblos por donde pasa la carretera, no uno
  cada ~40 km, y cuenta los que tienen variante (centro a 6 km o menos).
  Sin migración.
- **"Otro pueblo" en vez de "¿Por cuál camino vas?" (22 de octubre de
  2026):** se quitó escoger entre caminos (casi no cambiaban). Queda la ruta
  más rápida, y en "¿Por dónde vas?" el transportista agrega el pueblo si no
  está: su ruta pasa a ir por ahí. Sin migración.
- **"Comienza tu viaje" (22 de octubre de 2026):** botón que abre el mapa
  hasta su destino (Google Maps en Android, Mapas en iPhone); luego dice
  "Continúa tu viaje". Sin migración.
- **Tocar un pueblo del dibujo (22 de octubre de 2026):** en "¿Por dónde
  vas?" se toca el pueblo en el dibujo de puntos; los que ya pasó quedan
  tachados y se pueden tocar para corregir. La lista desplegable se quitó y
  abajo queda "¿Vas por un pueblo que no está en la ruta?" para los demás. Sin
  migración.
- **Sin teléfono del cliente (23 de octubre de 2026):** el formulario de
  `/solicitar` ya no pide "Tu teléfono" (Yohany): no lo veía nadie y los
  controles que lo usaban eran flojos porque el número no se verifica. El
  límite queda en 20 solicitudes por hora por conexión, y "una cosa a la vez"
  la cuida el navegador. La columna `whatsapp` de `requests` queda vacía en
  las nuevas. Sin migración.
- **PR #59:** consejos de seguridad ("Para cuidarte") para el cliente y el
  transportista, y "Mudavía no te cobra y nunca te escribe" en el inicio.
  "Reportar" se probó y se quitó: queda para después en docs/MVP.md.
- **PR #60:** página de ayuda (`/ayuda`) con cómo funciona, qué acordar antes
  del trasteo, preguntas y qué hacer si hubo fraude, enlazada
  desde "Para cuidarte" y desde el inicio.
