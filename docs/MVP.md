# Mudavía · Alcance del MVP

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
identifica cada publicación y el navegador recuerda los datos básicos (mano de
obra y número) para no volver a escribirlos.

**Carga por tamaño de casa.** El cliente y el transportista eligen de la misma
lista: "Paquetes o sobres", "Algunas cosas", "Una habitación o apartaestudio" y
"Una casa de 2 habitaciones o más". No se pregunta el vehículo: Yohany lo quitó
en octubre de 2026 porque lo que importa es cuánto puede llevar.

**Llamada o WhatsApp.** Al transportista se le pide "Tu teléfono", no "Tu
WhatsApp". Al cliente no se le pide (Yohany, 23 de octubre de 2026): es él
quien llama o escribe, y el transportista ve su número solo entonces. Cada
transportista que le sale al cliente tiene dos botones: "Escribir por
WhatsApp" (con el mensaje listo) y "Llamar". Al transportista se le dice que
los clientes lo pueden llamar o escribir por WhatsApp.

**El transportista no contacta al cliente.** Por la privacidad del cliente
(Yohany, octubre de 2026), siempre es el cliente quien llama o escribe. El
transportista no ve la lista de clientes que esperan: una lista con la que no
puede hacer nada solo frustra. Espera que lo llamen. Solo ve, en "Te
encontraron", a los que tocaron su tarjeta, sin su teléfono.

**Municipios.** Están todos los de Colombia (DIVIPOLA del DANE). Se buscan
escribiendo parte del nombre, con o sin tildes, o en la lista completa que se
despliega con la flecha, agrupada por departamento; el campo vacío dice
"Escribe o elige". Al tocar el campo no se sugiere nada, y ninguna región va
primero. No hay botón "Ubicarme" (Yohany, 22 de octubre de 2026): el origen
se elige igual que el destino.

**Pantalla del transportista** (`/transportista`)
- Siempre va de viaje: origen y destino obligatorio
  ("¿Hacia dónde vas?"). No hay modo local: Yohany lo quitó en octubre de 2026
  para enfocar el MVP en aprovechar viajes que ya se van a hacer. Por debajo es
  el Modo Ruta; la pantalla no le explica esa lógica al transportista.
- La primera opción de la lista del destino es "Cualquier destino" ("Vas a
  donde te pidan"), también al escribir "cual". Es para el que sale de su municipio hacia donde le pidan (Yohany,
  octubre de 2026). Su tarjeta dice "Montería → Cualquier destino".
- Qué día viaja (hoy, mañana u otro día), cuánto puede llevar (la lista de
  tamaños) y teléfono. No hay jornadas: Yohany las quitó en
  octubre de 2026.
  "Hoy" viene elegido. Su tarjeta dice "Viajas desde…": el día es desde
  cuándo viaja y no se vence (Yohany, 21 de octubre de 2026); sigue hasta
  "Ya no estoy disponible". Las rutas que se repiten quedan para
  después, como mejora futura.
- "¿Por dónde vas?": en su tarjeta toca en el dibujo de su ruta el pueblo
  por donde va. Lo cambia él a mano, sin la ubicación del teléfono
  (Yohany, 22 de octubre de 2026). Deja de salirles a los clientes que ya dejó
  atrás. Se guarda solo el municipio; el cliente no lo ve (Yohany, 21 de
  octubre de 2026). Los pueblos son los de la carretera de verdad, y el match
  también la sigue: se calcula una vez al ponerse disponible con
  OpenRouteService (gratis) y, si no responde, se usa la línea recta.
  El dibujo tiene un punto por pueblo, del origen al destino: los que ya pasó
  quedan tachados, pero se pueden tocar por si se equivocó (Yohany, 22 de
  octubre de 2026).
- Si el pueblo por donde va no está en la ruta, lo escribe debajo, en "¿Vas
  por un pueblo que no está en la ruta?": su camino pasa a ir por ahí, y la lista y los
  clientes que lo ven siguen ese camino (Yohany, 22 de octubre de 2026).
- "Comienza tu viaje" (Yohany, 22 de octubre de 2026): en su tarjeta, un
  botón abre el mapa con el camino hasta su destino, desde donde está el
  teléfono: Google Maps en Android y Mapas de Apple en iPhone. Después de
  tocarlo, o si ya marcó un pueblo en "¿Por dónde
  vas?", dice "Continúa tu viaje". Lo que hace en el mapa no vuelve a Mudavía:
  "¿Por dónde vas?" lo sigue cambiando él. Con "Cualquier destino" no sale.
- Un trabajo a la vez: si el teléfono ya tiene uno, en vez del formulario ve
  "Estás disponible para este servicio" con sus datos y "Ya no estoy
  disponible". Ese botón (que también sirve
  si se llenó) lo apaga y le devuelve el formulario con los mismos datos para
  ponerse otra vez cuando quiera. Se controla con un token que solo vive en su
  teléfono.
- La pantalla revisa sola, al volver a la app y cada minuto, si su
  disponibilidad sigue encendida. Los clientes que solicitan después de que
  él se puso disponible lo ven en su lista y lo llaman.
- "¿Cuánto espacio te queda?" (Yohany, 21 de octubre de 2026): debajo de sus
  datos tiene una lista desplegable con las mismas opciones de "¿Cuánto puedes
  llevar?", las cuatro siempre. Cuando carga, la baja, y cuando descarga, la
  sube, aunque haya salido lleno. Los clientes solo lo ven si les cabe. Reemplaza a "Te encontraron"
  (la lista de clientes que tocaron su tarjeta, con "Lo llevo"), que se quitó.

**Pantalla del cliente** (`/solicitar`)
- Una sola pantalla, casi igual a la del transportista: sin pasos, con las
  mismas preguntas en el mismo orden. Yohany lo pidió en octubre de 2026.
- La dirección es `/solicitar`. Antes era `/cotizar`, que ahora lleva a
  `/solicitar` para que no se rompan los enlaces guardados o compartidos.
- Desde dónde y hacia dónde, que no puede ser el mismo municipio; qué día
  ("Cualquier día", que viene elegido, Hoy, Mañana o calendario); qué va a mover, con la lista de tamaños. No se pide el teléfono (Yohany, 23
  de octubre de 2026): ya no hay avisos, y es el cliente quien llama. No se pregunta la ayuda para cargar (Yohany, 20 de octubre de
  2026): la hablan por teléfono.

Al tocar "Solicitar transportista" ve la lista de transportistas compatibles con
botones para escribir por WhatsApp o llamar (match inmediato), y la invitación
a acordar el precio. Si no hay ninguno, la solicitud queda guardada para el
match diferido. Por eso el botón dice "Solicitar" y no "Buscar".

Una solicitud a la vez, como el transportista: el teléfono la recuerda con un
token (en la base solo va el hash). Si vuelve a `/solicitar`, en vez del
formulario ve "Tu solicitud" con los transportistas que le sirven en ese
momento, también los que aparecieron después. La lista se actualiza sola
apenas un transportista de ese día se pone disponible o cambia la suya
(Supabase Realtime), además de al volver a la app y cada minuto.

Una cosa a la vez en cada teléfono, también entre los dos papeles (Yohany,
octubre de 2026): o tiene una solicitud o un viaje como transportista. Mientras
la tenga, Mudavía lo lleva siempre a esa pantalla; el inicio y la pantalla del
otro papel no se ven hasta que la cierre o se venza. Lo revisa lo que guarda
el navegador; como el cliente ya no da su número, el servidor no lo cruza.

No hay avisos al celular (Yohany, 22 de octubre de 2026): en iPhone había que
agregar Mudavía a la pantalla de inicio para recibirlos y era muy complicado.
El cliente entra cada tanto a mirar, y la pantalla de espera se lo dice ("Entra
a Mudavía cada tanto para mirar."). El transportista tampoco recibe avisos.

Arriba ve los datos de su solicitud: la ruta, el día y qué va a mover.
Es una pantalla de espera: mientras no hay transportistas ve "Buscando
transportistas…" con una animación de radar, y con transportistas, "Seguimos
buscando más transportistas." debajo de la lista.

Tiene dos botones:
- "Ya no necesito este servicio": pide confirmar ("¿Dejamos de mostrar tu
  solicitud a los transportistas?"), deja de salirles a los transportistas y
  le devuelve el formulario con los mismos datos.
- "Cambiar mi solicitud": le devuelve el formulario con los mismos datos.
  Al enviarla, la nueva reemplaza la de antes, que deja de salirles a los
  transportistas.

Vale hasta que termina el día del viaje: después se olvida y vuelve el formulario.
La de "Cualquier día" no se vence: le salen los transportistas de cualquier día
(con el día en que viaja cada uno) hasta que diga "Ya no necesito este servicio".

**Sin precio.** La app no calcula ningún precio: el cliente y el transportista
lo acuerdan cuando hablan. Yohany lo decidió en octubre de 2026, porque medir
la carga por tamaño de casa hace menos preciso cualquier cálculo. Qué mueve el
cliente y si necesita ayuda para cargar lo hablan en la llamada. Las escaleras ya no se
preguntan.

**Emparejamiento** (`src/lib/matching.ts`)
- Ruta: origen y destino del cliente quedan cerca del corredor del
  transportista y en el mismo sentido de viaje, también cerca de las puntas
  (de Bello a Medellín no le sirve a quien va de Bogotá a Medellín). No le
  salen los clientes que quedan más de 20 km detrás de donde sale, o de por
  dónde va si ya lo marcó. No hay match por cercanía al origen.
- Cualquier destino: le salen los clientes de ese día que salen de su
  municipio o de uno cercano (a 35 km o menos), vayan a donde vayan.
- Origen y destino nunca son el mismo municipio, ni para el cliente ni para el
  transportista: no hay trasteos dentro del mismo pueblo. El municipio elegido
  en un campo no sale en la lista del otro.
- Además: el cliente pide el día del transportista o uno después (o
  "Cualquier día") y lo que mueve es igual o más
  chico que lo que al transportista le queda por llevar. La ayuda para cargar
  no cuenta: no se pregunta.

**Privacidad y términos**: permiso para guardar los datos encima de los
botones de enviar y página "Cómo cuidamos tus datos" (`/privacidad`), por la
Ley 1581 de 2012. El contacto es de prueba mientras dura el demo. Los términos
y condiciones también entran en el MVP; falta escribirlos.

**Consejos de seguridad** (`src/lib/safety.ts`, Yohany, 23 de octubre de
2026): Mudavía no maneja plata, así que los fraudes pasan en la llamada o el
WhatsApp. El cliente ve "Para cuidarte" en "Tu solicitud" (no pagar antes de
ver el carro, pedir cédula y placa, pagar al entregar) y el transportista
debajo de sus datos (revisar que la plata llegó, no llevar paquetes cerrados,
desconfiar de citas en lugares solos). Los dos y el inicio dicen "Mudavía no
te cobra y nunca te escribe". "Qué hacer si te estafan" lleva a `/ayuda`, con
los pasos que la persona puede dar sola: el 123, avisar al banco o a Nequi,
guardar pantallazos y denunciar en ADenunciar o el CAI Virtual. No hay botón
para reportar: queda para después.

**Aparecer en Google (SEO)**: entra en el MVP, pero está en espera. El plan
está en el punto 10c de [pendientes.md](pendientes.md).

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

- Carros particulares: llevar paquetes y sobres en el baúl o en los asientos
  traseros de un carro que ya va de viaje. Yohany lo sacó del MVP en octubre
  de 2026. Cuando vuelva, lo que había: el vehículo "Carro particular"
  (`carro`) con dos espacios, "Espacio en el baúl" (`baul`) y "Asientos
  traseros libres" (`asientos`), que solo servían para sobres y paquetes
  pequeños, y su dibujo. La base de datos todavía acepta esas claves, y el
  código está en el historial de git (commit `3b0b5d7`, PR #18). Como ya no se
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
  (la tabla `reviews` ya existe).
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
