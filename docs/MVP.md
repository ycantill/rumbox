# Rumbox · Alcance del MVP

> Los PR citados (#1 a #77) son del repositorio anterior, que es privado.

> **Rediseño de Rumbox (Yohany, 27 de octubre de 2026).** La app se llama
> Rumbox y tiene la identidad y las pantallas del diseño de Claude Design:
> trato de usted, servicios (hoy mudanza, flete y encomienda) y "¿Qué
> servicios hace?" para el que viaja, que filtra el
> emparejamiento (migración `0020_servicios.sql`). Desde el 28 de octubre no
> se pregunta el tamaño ni el espacio: el que viaja cambia sus servicios
> durante el viaje. Al cerrar la solicitud o
> dejar de estar disponible, la app vuelve al inicio con un aviso. Donde este documento cite textos de antes, valen los
> de la app (ver CLAUDE.md, "Diseño de Rumbox" y "Servicios").
>
> **Solo carga (Yohany, 4 de noviembre de 2026).** El MVP se enfoca en
> furgones y camiones de estacas: salen los encargos y las diligencias, y
> los carros particulares siguen por fuera. Quedan tres servicios: mudanza,
> flete y encomienda (migración `0023_solo_carga.sql`).

Basado en el documento de producto "Plataforma Web de Logística Inteligente:
Mudanzas y Fletes Híbridos". El objetivo del MVP es validar que transportistas
y clientes de la región piloto se conectan por la plataforma, con costo
operativo cercano a cero. Todavía no está definido dónde será el piloto (el
documento proponía Córdoba y la Costa).

## Qué incluye

**Lenguaje sencillo.** La app es para personas que no usan mucho el celular:
nada de palabras técnicas (ruta programada, cotización, mano de obra, GPS) en
la pantalla.

**Disponible, no "publicación".** En el sistema cada registro es una
publicación, pero para el transportista es un estado: "se pone disponible"
para un viaje, desde el día que elige y hasta que diga "Ya no estoy
disponible": no se vence.
La pantalla nunca habla de publicar, y la palabra "disponible" se usa solo en
el botón principal y en el título de su servicio para no repetirla. Tampoco le
promete clientes: dice que está disponible, no que está recibiendo clientes.

**Cero registros.** No hay cuentas ni contraseñas. El número de teléfono
identifica cada publicación y el navegador recuerda el número del que viaja
para no volver a escribirlo. El cliente no da número: su solicitud la
controla un token que guarda su teléfono.

**Sin tamaño ni vehículo.** No se pregunta qué tan grande es la carga ni
cuánto espacio tiene el que viaja (Yohany, 28 de octubre de 2026): es
aproximado y lo hablan por teléfono, como el precio. Filtran los servicios.
Tampoco se pregunta el vehículo (Yohany, octubre de 2026).

**Llamada o WhatsApp.** Al transportista se le pide "Su teléfono", no "Su
WhatsApp". Al cliente no se le pide (Yohany, 23 de octubre de 2026): es él
quien llama o escribe, y el transportista ve su número solo entonces. Cada
conductor que le sale al cliente tiene dos botones: "Escribir por
WhatsApp" (con el mensaje listo) y "Llamar". Al transportista se le dice que
los clientes lo pueden llamar o escribir por WhatsApp.

**El transportista no contacta al cliente.** Por la privacidad del cliente
(Yohany, octubre de 2026), siempre es el cliente quien llama o escribe. El
transportista no ve la lista de clientes que esperan: una lista con la que no
puede hacer nada solo frustra. Espera que lo llamen.

**Municipios.** Están todos los de Colombia (DIVIPOLA del DANE). Se buscan
escribiendo parte del nombre, con o sin tildes, o en la lista completa que se
despliega con la flecha, agrupada por departamento; el campo vacío dice
"Escriba o elija". Al tocar el campo no se sugiere nada, y ninguna región va
primero. No hay botón "Ubicarme" (Yohany, 22 de octubre de 2026): el origen
se elige igual que el destino.

**Pantalla del transportista** (`/transportista`)
- Siempre va de viaje: la pantalla se titula "¿Hacia dónde va?" y pide de
  dónde sale ("Está en") y el destino, obligatorio ("Va a"). No hay modo local: Yohany lo quitó en octubre de 2026
  para enfocar el MVP en aprovechar viajes que ya se van a hacer. Por debajo es
  el Modo Ruta; la pantalla no le explica esa lógica al transportista.
- La primera opción de la lista del destino es "Cualquier destino" ("Va a
  donde le pidan"), también al escribir "cual". Es para el que sale de su
  municipio hacia donde le pidan (Yohany, octubre de 2026).
- "¿Qué día sale?" (Hoy, Mañana u Otra fecha), "¿Qué servicios hace?"
  (puede marcar varios) y "Su teléfono". No hay jornadas: Yohany las quitó
  en octubre de 2026.
  "Hoy" viene elegido. Su tarjeta dice "Sale hoy.": el día es desde
  cuándo viaja y no se vence (Yohany, 21 de octubre de 2026); sigue hasta
  "Ya no estoy disponible". Las rutas que se repiten quedan para
  después, como mejora futura.
- "¿Por dónde va?": debajo de sus datos toca en el dibujo de su ruta el pueblo
  por donde va. Lo cambia él a mano, sin la ubicación del teléfono
  (Yohany, 22 de octubre de 2026). Deja de salirles a los clientes que ya dejó
  atrás. Se guarda solo el municipio; el cliente no lo ve (Yohany, 21 de
  octubre de 2026). Los pueblos son los de la carretera de verdad, y el match
  también la sigue: se calcula una vez al ponerse disponible con
  OpenRouteService (gratis) y, si no responde, se usa la línea recta.
  El dibujo tiene un punto por pueblo, del origen al destino: el de ahora
  dice "Usted va aquí" y los que ya pasó quedan en gris, pero se pueden tocar por si se equivocó (Yohany, 22 de
  octubre de 2026).
- Si el pueblo por donde va no está en la ruta, lo escribe debajo, en "+ Paso
  por otro pueblo": su camino pasa a ir por ahí, y la lista y los
  clientes que lo ven siguen ese camino (Yohany, 22 de octubre de 2026).
- "Comenzar viaje en Maps" (Yohany, 22 de octubre de 2026): en su tarjeta, un
  botón abre el mapa con el camino hasta su destino, desde donde está el
  teléfono: Google Maps en Android y Mapas de Apple en iPhone. Después de
  tocarlo, o si ya marcó un pueblo en "¿Por dónde
  va?", dice "Continuar viaje en Maps". Lo que hace en el mapa no vuelve a Rumbox:
  "¿Por dónde va?" lo sigue cambiando él. Con "Cualquier destino" no sale.
- Un trabajo a la vez: si el teléfono ya tiene uno, en vez del formulario ve
  "Usted está disponible" con sus datos y "Ya no estoy disponible". Ese
  botón (que también sirve si se llenó del todo) pide confirmar en una hoja
  ("¿Dejar de estar disponible?"), lo apaga y lo devuelve al inicio con el
  aviso "Ya no aparece en las búsquedas. Buen viaje.". Se controla con un
  token que solo vive en su teléfono.
- La pantalla revisa sola, al volver a la app y cada minuto, si su
  disponibilidad sigue encendida. Los clientes que solicitan después de que
  él se puso disponible lo ven en su lista y lo llaman.
- "¿Qué servicios hace ahora?" (Yohany, 28 de octubre de 2026): debajo de
  sus datos cambia sus servicios durante el viaje. Si se llena, quita
  mudanzas y fletes; si descarga a mitad de camino, los vuelve a marcar.
  Reemplazó a "¿Cuánto espacio te queda?" (21 de octubre de 2026), que a su
  vez reemplazó a "Te encontraron".

**Pantalla del cliente** (`/solicitar`)
- Una sola pantalla, casi igual a la del transportista: sin pasos, con las
  mismas preguntas en el mismo orden. Yohany lo pidió en octubre de 2026.
- La dirección es `/solicitar`. Antes era `/cotizar`, que ahora lleva a
  `/solicitar` para que no se rompan los enlaces guardados o compartidos.
- Primero "¿Qué necesita?": uno de los tres servicios, sin tamaño. Luego
  "Desde" y "Hasta", que no pueden ser el mismo municipio, y "¿Para
  cuándo?" ("Cualquier día", que viene elegido, Hoy, Mañana u Otra fecha). No se pide el teléfono (Yohany, 23
  de octubre de 2026): ya no hay avisos, y es el cliente quien llama. No se pregunta la ayuda para cargar (Yohany, 20 de octubre de
  2026): la hablan por teléfono.

Al tocar "Buscar conductor" ve un momento "Buscando conductores" y luego la
lista de conductores compatibles ("2 conductores van para allá"), con
botones para escribir por WhatsApp o llamar (match inmediato), y "Llame o
escriba y acuerden el precio.". Si no hay ninguno, la solicitud queda
guardada para el match diferido. El botón decía "Solicitar transportista";
el diseño de Rumbox lo cambió.

Una solicitud a la vez, como el transportista: el teléfono la recuerda con un
token (en la base solo va el hash). Si vuelve a `/solicitar`, en vez del
formulario ve "Su solicitud" con los conductores que le sirven en ese
momento, también los que aparecieron después. La lista se actualiza sola
apenas un conductor se pone disponible o cambia la suya
(Supabase Realtime), además de al volver a la app y cada minuto.

Una cosa a la vez en cada teléfono, también entre los dos papeles (Yohany,
octubre de 2026): o tiene una solicitud o un viaje como transportista. Mientras
la tenga, Rumbox lo lleva siempre a esa pantalla; el inicio y la pantalla del
otro papel no se ven hasta que la cierre o se venza. Lo revisa lo que guarda
el navegador; como el cliente ya no da su número, el servidor no lo cruza.

No hay avisos al celular (Yohany, 22 de octubre de 2026): en iPhone había que
agregar Rumbox a la pantalla de inicio para recibirlos y era muy complicado.
El cliente entra cada tanto a mirar, y la pantalla de espera se lo dice ("Entre
a Rumbox cada tanto para mirar."). El transportista tampoco recibe avisos.

Arriba ve los datos de su solicitud, como una guía de envío: "Desde",
"Hasta", "Servicio" y "Cuándo". Es una pantalla de espera: mientras no hay
conductores ve "Buscando conductores..." con ondas de señal, y con
conductores, "Seguimos buscando conductores. Vuelva a mirar más tarde."
debajo de la lista. Cada tarjeta lleva ↑ si el conductor va directo a su
destino y ↗ si pasa por ahí y sigue.

Tiene dos botones:
- "Ya no necesito el servicio": pide confirmar en una hoja ("¿Cerrar su
  solicitud?"), deja de salirles a los conductores y vuelve al inicio con
  el aviso "Listo. Cerramos su solicitud.".
- "Cambiar": le devuelve el formulario con los mismos datos. "← Volver" y la flecha de atrás del teléfono lo regresan a su solicitud sin cambiarla.
  Al enviarla, la nueva reemplaza la de antes, que deja de salirles a los
  conductores.

Vale hasta que termina el día del viaje: después se olvida y vuelve el formulario.
La de "Cualquier día" no se vence: le salen los transportistas de cualquier día
(con el día en que viaja cada uno) hasta que diga "Ya no necesito el servicio".

**Sin precio.** La app no calcula ningún precio: el cliente y el transportista
lo acuerdan cuando hablan. Yohany lo decidió en octubre de 2026, porque la
carga no se mide con precisión (y desde el 28 de octubre ni se pregunta su
tamaño). Qué lleva el cliente y si necesita ayuda para cargar lo hablan en
la llamada. Las escaleras ya no se
preguntan.

**Emparejamiento** (`src/lib/matching.ts`)
- Ruta: origen y destino del cliente quedan cerca del corredor del
  transportista y en el mismo sentido de viaje, también cerca de las puntas
  (de Bello a Medellín no le sirve a quien va de Bogotá a Medellín). No le
  salen los clientes que quedan más de 20 km detrás de donde sale, ni, si
  ya marcó por dónde va, los que ya pasó (Yohany, 28 de octubre de 2026:
  le tocaría devolverse). No hay match por cercanía al origen.
- Cualquier destino: le salen los clientes que salen a 35 km o menos de
  donde está (el pueblo que marcó o, si no ha marcado, el de donde sale),
  vayan a donde vayan.
- Origen y destino nunca son el mismo municipio, ni para el cliente ni para el
  transportista: no hay trasteos dentro del mismo pueblo. El municipio elegido
  en un campo no sale en la lista del otro.
- Además: el cliente pide el día del transportista o uno después (o
  "Cualquier día") y uno de los servicios que hace. No se miran el tamaño
  ni la ayuda para cargar: no se preguntan.

**Privacidad y términos**: permiso para guardar los datos encima de los
botones de enviar y página "Cómo cuidamos sus datos" (`/privacidad`), por la
Ley 1581 de 2012. El contacto es de prueba mientras dura el demo. Los
términos y condiciones (`/terminos`) están en borrador: Rumbox solo conecta, no
cobra, no revisa a las personas ni la carga y no responde por el servicio, y
lo que no se permite. La misma nota de los botones dice "Al continuar acepta
los términos y condiciones", y el inicio los enlaza en el pie.

**Consejos de seguridad** (`src/lib/safety.ts`, Yohany, 23 de octubre de
2026): Rumbox no maneja plata, así que los fraudes pasan en la llamada o el
WhatsApp. El cliente ve los consejos la primera vez que toca
"Escribir por WhatsApp" o "Llamar" en cada visita, en una hoja ("Antes de
escribir" o "Antes de llamar") que sigue con "Entendido, escribir" (o
"llamar") y tiene "Cancelar" (no pagar antes de ver el carro, pedir cédula
y placa, pagar al entregar). El transportista tiene
los suyos debajo de sus datos (revisar que la plata llegó, no llevar paquetes cerrados,
desconfiar de citas en lugares solos), en "Para cuidarse". Los dos y el
inicio dicen "Rumbox nunca le cobra ni le escribe". "Qué hacer si lo
estafan" lleva a `/ayuda`, solo
de fraudes y seguridad: qué acordar por WhatsApp antes del trasteo y los pasos que la persona puede dar sola: el 123, avisar al banco o a Nequi,
guardar pantallazos y denunciar en ADenunciar o el CAI Virtual. No hay botón
para reportar: queda para después.

**Aparecer en Google (SEO)**: entra en el MVP. La base técnica está hecha
(`src/lib/site.ts`, `robots.ts`, `sitemap.ts`, descripción por pantalla e
imagen para compartir), pero Google no la muestra (`noindex`) hasta abrir al
público. El resto del plan está en el punto 10c de
[pendientes.md](pendientes.md).

**Analíticas** (`src/lib/analytics.ts`): para saber si el piloto funciona,
la app cuenta las visitas a cada pantalla, si quien entra ya había venido
antes, y cuántas veces un cliente toca "Escribir por WhatsApp" o "Llamar" en
la tarjeta de un transportista. No guarda nada de la persona: ni teléfono, ni
conexión, ni un identificador del navegador. Los números se ven en Supabase,
por día (`analiticas_por_dia`) y por municipio de salida
(`analiticas_por_municipio`), junto con las solicitudes y las
disponibilidades. Además, Vercel Web Analytics (gratis, sin cookies) muestra
en su panel las visitas, el país, el celular y de qué página llega la gente.

**PWA**: manifest instalable y service worker que guarda las páginas para que
abran con mala señal.

## Qué queda para después

- Encargos (que le compren algo y se lo traigan) y diligencias (una vuelta,
  un trámite, recoger algo). Llegaron con el diseño de Rumbox el 27 de
  octubre de 2026 y Yohany los sacó el 4 de noviembre de 2026 para enfocar el
  MVP en carga con furgones y camiones de estacas. Cuando vuelvan: sus
  claves eran `encargo` y `diligencia`, sus íconos (bolsa de compra y sobre)
  están en el historial de git, y hay que abrir otra vez las revisiones de
  `requests.service` y `availabilities.services` en una migración nueva.
  Queda sin decidir si la diligencia necesita destino.
- Carros particulares: llevar paquetes y sobres en el baúl o en los asientos
  traseros de un carro que ya va de viaje. Yohany lo sacó del MVP en octubre
  de 2026. Cuando vuelva, lo que había: el vehículo "Carro particular"
  (`carro`) con dos espacios, "Espacio en el baúl" (`baul`) y "Asientos
  traseros libres" (`asientos`), que solo servían para sobres y paquetes
  pequeños, y su dibujo. Las columnas `vehicle_type` y `space` se quitaron
  en `0022_limpieza.sql`; el código está en el historial de git (commit
  `3b0b5d7`, PR #18). Como ya no se
  pregunta el vehículo, al volver habría que decidir cómo dice el transportista
  que lleva paquetes en un carro.
- Precio aproximado. Salió del MVP en octubre de 2026. Lo que había: tarifa
  base según lo que se mueve, más un valor por km (línea recta × 1.3), la
  ayuda para cargar y cada piso por escalera, con 25% de descuento si había un
  transportista que ya iba para allá. Se mostraba en vivo mientras el cliente
  llenaba los pasos. El código (`src/lib/pricing.ts` y sus pruebas) está en el
  historial de git (commit `7a69796`). Las tarifas nunca se calibraron con
  precios reales; los precios que acuerden en el piloto servirían para eso.
- Fotos del vehículo y de la carga (Supabase Storage).
- Notificación proactiva por WhatsApp al transportista cuando entra una
  solicitud en su ruta (requiere la API oficial de WhatsApp).
- Aviso al celular al cliente cuando aparece un transportista (Web Push). Se
  hizo y se quitó el 22 de octubre de 2026 (Yohany): en iPhone solo funciona
  con la app agregada a la pantalla de inicio. El código está en el historial
  de git (PR #28).
- Reseñas automáticas 24 h después del viaje y felicitación al transportista
  (la tabla `reviews` se quitó en `0022_limpieza.sql`: se crea de nuevo
  cuando lleguen).
- Formularios offline que se sincronizan al recuperar señal.
- Monetización (el detalle está en el documento de negocio, que es privado).
- Autocompletado de direcciones y barrios (hoy se busca el municipio entre todos
  los de Colombia).
- El resto del anti-spam: captcha y verificar el número con un código por SMS.
- Reportar a un transportista o un número, con bloqueo (Yohany, 23 de octubre
  de 2026): se construyó en el PR #59 y se quitó, porque sin alguien que
  atienda los casos no le resuelve nada a quien reporta. Vuelve cuando haya
  quién responda, con pasos concretos según lo que pasó (banco o Nequi, 123,
  denuncia en ADenunciar o el CAI Virtual de la Policía).
  El transportista ya tiene límite por teléfono y por conexión, y el cliente
  por conexión.
