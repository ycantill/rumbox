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

**Cero registros.** No hay cuentas ni contraseñas. El WhatsApp identifica cada
publicación y el navegador recuerda los datos básicos (tipo de vehículo, mano
de obra, número) para no volver a escribirlos.

**Municipios.** Están todos los de Colombia (DIVIPOLA del DANE). Se buscan
escribiendo parte del nombre, con o sin tildes, o en la lista completa que se
despliega con la flecha, agrupada por departamento. Al tocar el campo no se
sugiere nada, y ninguna región va primero.

**Pantalla del transportista** (`/transportista`)
- Siempre va de viaje: origen con botón "Ubicarme" y destino obligatorio
  ("¿Hacia dónde vas?"). No hay modo local: Yohany lo quitó en octubre de 2026
  para enfocar el MVP en aprovechar viajes que ya se van a hacer. Por debajo es
  el Modo Ruta; la pantalla no le explica esa lógica al transportista.
- Qué día viaja (hoy, mañana u otro día) y jornada (mañana, tarde, noche o
  todo el día), tipo de vehículo, espacio disponible, mano de obra y WhatsApp.
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

**Cotizador del cliente** (`/cotizar`), 4 pasos
1. Ruta y fecha (Hoy, Mañana o calendario).
2. Volumen: sobres, carga parcial, medio camión, camión entero.
3. Mano de obra y escaleras en origen y destino. Con sobres o paquetes
   pequeños este paso se salta: no cambia el precio.
4. WhatsApp.

Muestra el precio estimado mientras llena el formulario, el desglose, y la
lista de transportistas compatibles con botón de WhatsApp (match inmediato).
Si no hay ninguno, la solicitud queda guardada para el match diferido.

**Precios** (`src/lib/pricing.ts`): tarifa base por volumen + valor por km
(distancia en línea recta × 1.3) + mano de obra + pisos por escalera.
Descuento del 25% cuando hay un transportista compatible (todos van de viaje).
Las tarifas son valores iniciales para calibrar con precios reales del piloto.

**Emparejamiento** (`src/lib/matching.ts`)
- Ruta: origen y destino del cliente quedan cerca del corredor del
  transportista y en el mismo sentido de viaje. Un servicio dentro de una
  ciudad del corredor también vale. No hay match por cercanía al origen.
- Además: el cliente pide el mismo día del viaje, el espacio alcanza para el
  volumen y la mano de obra ofrecida cubre la pedida.

**PWA**: manifest instalable y service worker que guarda las páginas para que
abran con mala señal.

## Qué queda para después

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
