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
publicación, pero para el transportista es un estado: "se pone disponible" y
luego cada día queda "Recibiendo clientes" o "Lleno". La pantalla nunca habla
de publicar, y la palabra "disponible" se usa solo en el botón principal y en
la confirmación para no repetirla.

**Cero registros.** No hay cuentas ni contraseñas. El WhatsApp identifica cada
publicación y el navegador recuerda los datos básicos (tipo de vehículo, mano
de obra, número) para no volver a escribirlos.

**Pantalla del transportista** (`/transportista`)
- Origen con botón "Ubicarme" y destino opcional. Por debajo, con destino se
  activa el Modo Ruta y sin destino el match es por cercanía al origen; la
  pantalla no le explica esa lógica al transportista.
- Fecha y jornada (mañana, tarde, noche o todo el día), tipo de vehículo, espacio disponible, mano de obra y
  WhatsApp.
- Un día de trabajo a la vez: si el teléfono ya tiene uno de hoy en adelante,
  en vez del formulario ve "Tu día de trabajo" con los clientes que lo están
  esperando (match diferido), los botones "Ya estoy lleno" / "Ya tengo espacio
  otra vez" y "Solo queda espacio para paquetes", y "Ya no voy a trabajar ese
  día" para cancelarlo y poder poner otro. Se controla con un token que solo
  vive en su teléfono.

**Cotizador del cliente** (`/cotizar`), 4 pasos
1. Ruta y fecha (Hoy, Mañana o calendario).
2. Volumen: sobres, carga parcial, medio camión, camión entero.
3. Mano de obra y escaleras en origen y destino.
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
- Además: misma fecha, el espacio alcanza para el volumen y la mano de obra
  ofrecida cubre la pedida.

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
