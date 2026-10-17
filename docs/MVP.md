# Muvia · Alcance del MVP

Basado en el documento de producto "Plataforma Web de Logística Inteligente:
Mudanzas y Fletes Híbridos". El objetivo del MVP es validar que transportistas
y clientes de la región piloto (Córdoba y la Costa) se conectan por la
plataforma, con costo operativo cercano a cero.

## Qué incluye

**Lenguaje sencillo.** La app es para personas que no usan mucho el celular:
nada de palabras técnicas (ruta programada, cotización, mano de obra, GPS) en
la pantalla.

**Disponible, no "publicación".** En el sistema cada registro es una
publicación, pero para el transportista es un estado: "se pone disponible"
desde una fecha y lo sigue estando hasta que diga "Ya no recibo más clientes"
(o, si va de viaje, hasta que pase el día del viaje).
La pantalla nunca habla de publicar, y la palabra "disponible" se usa solo en
el botón principal y en el título de su servicio para no repetirla. Tampoco le
promete clientes: dice que está disponible, no que está recibiendo clientes.

**Cero registros.** No hay cuentas ni contraseñas. El WhatsApp identifica cada
publicación y el navegador recuerda los datos básicos (tipo de vehículo, mano
de obra, número) para no volver a escribirlos.

**Pantalla del transportista** (`/transportista`)
- Origen con botón "Ubicarme" y destino opcional. Por debajo, con destino se
  activa el Modo Ruta y sin destino el match es por cercanía al origen; la
  pantalla no le explica esa lógica al transportista.
- Desde cuándo trabaja (hoy, mañana u otro día) y jornada (mañana, tarde,
  noche o todo el día), tipo de vehículo, espacio disponible, mano de obra y
  WhatsApp. Queda disponible desde esa fecha en adelante; no hay fecha de fin.
- Si pone destino, es un viaje: se le pregunta "¿Qué día viajas?", su tarjeta
  dice "Viajas…" y vale solo ese día. Cuando pasa, se apaga solo y vuelve el
  formulario con sus datos. Las rutas que se repiten quedan para después, como
  mejora futura.
- Un trabajo a la vez: si el teléfono ya tiene uno, en vez del formulario ve
  "Estás disponible para este servicio" con sus datos, los clientes que lo
  están esperando (match diferido) y el día de cada uno, "Solo queda espacio
  para paquetes" y "Ya no recibo más clientes". Ese último botón sirve tanto si
  se llenó como si ya no va a trabajar: lo apaga y le devuelve el formulario
  con los mismos datos para ponerse otra vez cuando quiera. Se controla con un
  token que solo vive en su teléfono.

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
Descuento del 25% cuando hay un transportista en Modo Ruta compatible. Las
tarifas son valores iniciales para calibrar con precios reales del piloto.

**Emparejamiento** (`src/lib/matching.ts`)
- Disponible: el cliente sale a menos de 40 km de la ciudad del transportista.
- Ruta: origen y destino del cliente quedan cerca del corredor del
  transportista y en el mismo sentido de viaje.
- Además: el cliente pide un día igual o posterior a la fecha desde la que
  trabaja el transportista (con destino, el mismo día del viaje), el espacio
  alcanza para el volumen y la mano de obra ofrecida cubre la pedida.

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
- Autocompletado de direcciones y barrios (hoy se elige municipio de una lista).
- Protección anti-spam (límite de publicaciones por número, captcha).
