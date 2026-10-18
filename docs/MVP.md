# Muvia · Alcance del MVP

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
para un viaje, y vale hasta el día del viaje o hasta que diga "Ya no voy a
trabajar".
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

**Llamada o WhatsApp.** Se pide "Tu teléfono", no "Tu WhatsApp". Cada cliente
y cada transportista que sale en pantalla tiene dos botones: "Escribir por
WhatsApp" (con el mensaje listo) y "Llamar". Al transportista se le dice que
los clientes lo pueden llamar o escribir por WhatsApp.

**Municipios.** Están todos los de Colombia (DIVIPOLA del DANE). Se buscan
escribiendo parte del nombre, con o sin tildes, o en la lista completa que se
despliega con la flecha, agrupada por departamento; el campo vacío dice
"Escribe o elige". Al tocar el campo no se sugiere nada, y ninguna región va
primero. El origen, en las dos pantallas, tiene el botón "Ubicarme".

**Pantalla del transportista** (`/transportista`)
- Siempre va de viaje: origen con botón "Ubicarme" y destino obligatorio
  ("¿Hacia dónde vas?"). No hay modo local: Yohany lo quitó en octubre de 2026
  para enfocar el MVP en aprovechar viajes que ya se van a hacer. Por debajo es
  el Modo Ruta; la pantalla no le explica esa lógica al transportista.
- Qué día viaja (hoy, mañana u otro día) y jornada (mañana, tarde, noche o
  todo el día), cuánto puede llevar (la lista de tamaños), mano de obra y
  teléfono.
  Su tarjeta dice "Viajas…" y vale solo ese día. Cuando pasa, se apaga solo y
  vuelve el formulario con sus datos. Las rutas que se repiten quedan para
  después, como mejora futura.
- Un trabajo a la vez: si el teléfono ya tiene uno, en vez del formulario ve
  "Estás disponible para este servicio" con sus datos, los clientes que lo
  están esperando (match diferido) y el día de cada uno, "Solo queda espacio
  para paquetes" y "Ya no voy a trabajar". Ese último botón (que también sirve
  si se llenó) lo apaga y le devuelve el formulario con los mismos datos para
  ponerse otra vez cuando quiera. Se controla con un token que solo vive en su
  teléfono.

**Pantalla del cliente** (`/cotizar`), 4 pasos
1. Ruta (origen con botón "Ubicarme", y un destino que no puede ser el mismo
   municipio) y fecha (Hoy, Mañana o calendario).
2. Qué va a mover, con la lista de tamaños.
3. Si necesita ayuda para cargar. Con paquetes o sobres este paso se salta.
4. Teléfono.

Al tocar "Buscar transportista" ve la lista de transportistas compatibles con
botones para escribir por WhatsApp o llamar (match inmediato), y la invitación
a acordar el precio. Si no hay ninguno, la solicitud queda guardada para el
match diferido.

**Sin precio.** La app no calcula ningún precio: el cliente y el transportista
lo acuerdan cuando hablan. Yohany lo decidió en octubre de 2026, porque medir
la carga por tamaño de casa hace menos preciso cualquier cálculo. Para que el
transportista sepa qué cobrar, en su lista de clientes que esperan ve qué
mueve cada uno y si necesita ayuda para cargar. Las escaleras ya no se
preguntan.

**Emparejamiento** (`src/lib/matching.ts`)
- Ruta: origen y destino del cliente quedan cerca del corredor del
  transportista y en el mismo sentido de viaje. No hay match por cercanía al
  origen.
- Origen y destino nunca son el mismo municipio, ni para el cliente ni para el
  transportista: no hay trasteos dentro del mismo pueblo. El municipio elegido
  en un campo no sale en la lista del otro.
- Además: el cliente pide el mismo día del viaje, lo que mueve es igual o más
  chico que lo que el transportista puede llevar y la mano de obra ofrecida
  cubre la pedida.

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
- Reseñas automáticas 24 h después del viaje y felicitación al transportista
  (la tabla `reviews` ya existe).
- Formularios offline que se sincronizan al recuperar señal.
- Monetización (el detalle está en el documento de negocio, que es privado).
- Autocompletado de direcciones y barrios (hoy se busca el municipio entre todos
  los de Colombia).
- Protección anti-spam (límite de publicaciones por número, captcha).
