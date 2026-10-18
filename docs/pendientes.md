# Muvia · Pendientes

Lo que falta por decidir o construir en el MVP, por orden de importancia.
Actualizado el 18 de octubre de 2026. Los números son los de la revisión de
ese día; cuando algo se termine, pásalo a [Hecho](#hecho) con su PR.

## Decisiones de Yohany

### 10. Aviso de privacidad

- **Problema:** cualquiera que llene el formulario del transportista ve el
  teléfono de los clientes que esperan (hasta 20 por consulta, sin ninguna
  verificación), y ese número queda a la vista hasta la fecha del viaje (hasta
  90 días) o hasta que el cliente toque "Ya conseguí transportista". La app no
  tiene aviso de privacidad. En Colombia, la Ley 1581 de
  2012 (habeas data) pide autorización previa y una política de tratamiento de
  datos.
- **Propuesta:** una frase antes de "Solicitar transportista" ("Los transportistas
  verán tu número para llamarte o escribirte"), una parecida para el transportista y
  una página de privacidad enlazada desde ahí.
- **Falta:** el nombre del responsable (persona o empresa) y un correo de
  contacto. Conviene que alguien que conozca la ley lo revise antes de abrir
  la app al público.

## Propuestas

### 17. Medir los contactos

Contar cuántas veces se tocan los botones de WhatsApp y de llamar, del cliente
al transportista y al revés. Es el número que dice si el piloto funciona: el
objetivo del MVP es validar que clientes y transportistas se conectan. Necesita
una tabla nueva, en una migración (`supabase/migrations/0006_...sql`) que
Yohany corre en Supabase antes de desplegar.

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

- El transportista está disponible y un cliente solicita después: al volver
  a la app (o al minuto, con la pantalla abierta), el cliente le sale en la
  lista sin tener que recargar.
- El cliente solicita y cierra la app. Al abrir otra vez `/solicitar` ve "Tu
  solicitud" con los transportistas de ese momento, no el formulario.
- "Ya conseguí transportista" pide confirmar, vuelve el formulario con los
  mismos datos y el cliente ya no le sale a ningún transportista.
- "Hacer otra solicitud" y enviarla cambiando el día: al transportista del
  día de antes ya no le sale ese cliente.
- Un día después del viaje, "Tu solicitud" y "Estás disponible para este
  servicio" todavía se ven; dos días después vuelve el formulario con los
  datos de antes, sin el día.

- Instalar la app en Android y en iPhone y ver el logo de Muvia.
- Con el modo avión, tocar "Solicitar transportista" o "Ponerme disponible": debe
  salir el aviso de señal sin perder lo llenado.
- El cliente no ve ningún precio ni le preguntan por escaleras. Al final ve
  "Llama o escribe por WhatsApp y acuerden el precio", o "Guardamos tu
  solicitud" si no hay transportistas.
- En la lista del transportista, cada cliente dice si necesita ayuda para
  cargar, menos los de paquetes o sobres.
- El cliente llena todo en una sola pantalla, como el transportista. Con
  paquetes o sobres no sale "¿Necesitas ayuda para cargar?"; con lo demás,
  si no elige, sale "Elige si necesitas ayuda para cargar.".
- Ninguna de las dos pantallas pregunta la jornada: solo "Hoy", "Mañana" u
  otra fecha. "Hoy" sale también de noche.
- "Hacer otra solicitud" devuelve el formulario con lo que había llenado.
- Abrir un enlace viejo a `/cotizar`: debe llevar a `/solicitar`. También con
  la app instalada.
- Negar el permiso de ubicación y tocar "Ubicarme": debe salir el aviso. Ahora
  también en "¿Desde dónde?" del cliente.
- Los campos de municipio vacíos dicen "Escribe o elige" y el texto se ve
  entero, también al lado de "Ubicarme".
- El municipio elegido en un campo no sale en la lista del otro, y si lo
  escribe sale "Ese municipio ya lo elegiste. Elige otro." (se probó en el
  navegador del computador).
- Con un destino elegido, tocar "Ubicarme" estando en ese mismo municipio:
  sale "Elige otro municipio: no puede ser el mismo de salida." debajo del
  destino. El cliente no puede continuar y el transportista no puede ponerse
  disponible.
- Sin elegir hacia dónde va, no deja ponerse disponible.
- Un viaje: la pregunta "¿Qué día viajas?" y la tarjeta "Viajas…".
- Un teléfono que tenía guardada una disponibilidad sin destino, de antes: al
  abrir la pantalla vuelve el formulario con sus datos para elegir el destino.
- Tocar "Llamar" en un transportista o en un cliente: debe abrir el marcador
  con el número.
- Un teléfono que tenía guardado un carro particular: si estaba disponible,
  vuelve el formulario con sus datos y sin elegir cuánto puede llevar.
- El transportista ya no ve "¿Qué vehículo tienes?": elige en "¿Cuánto puedes
  llevar?" entre los cuatro tamaños, y su tarjeta dice "Puedes llevar…".
- Un transportista que puede llevar "Algunas cosas" le sale a un cliente que
  mueve algunas cosas, pero no a uno que mueve una habitación.

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
- **Rama `claude/project-thread-1s9lef`:** sin jornadas en las dos pantallas,
  solo el día; las solicitudes y disponibilidades valen el día del servicio y
  24 horas más (una para mañana se vence pasado mañana). El emparejamiento
  sigue siendo del mismo día. No necesita migración.
