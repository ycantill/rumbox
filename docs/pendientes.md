# Muvia · Pendientes

Lo que falta por decidir o construir en el MVP, por orden de importancia.
Actualizado el 17 de octubre de 2026. Los números son los de la revisión de
ese día; cuando algo se termine, pásalo a [Hecho](#hecho) con su PR.

## Decisiones de Yohany

### 10. Aviso de privacidad

- **Problema:** cualquiera que llene el formulario del transportista ve el
  WhatsApp de los clientes que esperan (hasta 20 por consulta, sin ninguna
  verificación), y ese número queda a la vista hasta la fecha del viaje (hasta
  90 días). La app no tiene aviso de privacidad. En Colombia, la Ley 1581 de
  2012 (habeas data) pide autorización previa y una política de tratamiento de
  datos.
- **Propuesta:** una frase antes de "Ver precio" ("Los transportistas verán tu
  WhatsApp para escribirte"), una parecida para el transportista y una página
  de privacidad enlazada desde ahí.
- **Falta:** el nombre del responsable (persona o empresa) y un correo de
  contacto. Conviene que alguien que conozca la ley lo revise antes de abrir
  la app al público.

### 16. Botón "Ya conseguí" para el cliente

- **Problema:** la solicitud del cliente queda abierta hasta la fecha del
  viaje, aunque ya haya conseguido transporte. Les sigue saliendo a los
  transportistas, que le siguen escribiendo, y su número sigue a la vista.
- **Propuesta:** un botón para que el cliente cierre su solicitud. Como no hay
  cuentas, se controlaría con un token en su teléfono, igual que el
  transportista; eso necesita una migración para guardar el hash.
- **Falta decidir:** dónde lo ve el cliente. Por ejemplo, al volver a
  `/cotizar` vería su solicitud con el botón.

### 9. Descuento por ruta

Sin modo local, todos los transportistas van de viaje: el cliente que
encuentra alguno siempre ve el precio con 25% de descuento. Quedan dos
detalles:

- El transportista ve, en su lista de clientes que esperan, el precio sin
  descuento, mientras que el cliente vio el precio con descuento.
- Un trasteo dentro del mismo pueblo cuenta como "en ruta", con descuento, si
  hay un transportista que sale de ese pueblo hacia otro lado. Ahora es la
  única forma de que un trasteo dentro del pueblo encuentre transportista. El
  cotizador todavía dice "Puede ser el mismo municipio si el trasteo es dentro
  del pueblo o la ciudad": falta decidir si se deja.

## Propuestas

### 17. Medir los contactos

Contar cuántas veces se toca el botón de WhatsApp, del cliente al
transportista y al revés. Es el número que dice si el piloto funciona: el
objetivo del MVP es validar que clientes y transportistas se conectan. Necesita
una tabla nueva, en una migración (`supabase/migrations/0002_...sql`) que
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

- Instalar la app en Android y en iPhone y ver el logo de Muvia.
- Con el modo avión, tocar "Ver precio" o "Ponerme disponible": debe salir el
  aviso de señal sin perder lo llenado.
- Con sobres, el cotizador debe tener 3 pasos.
- Negar el permiso de ubicación y tocar "Ubicarme": debe salir el aviso.
- Sin elegir hacia dónde va, no deja ponerse disponible.
- Un viaje: la pregunta "¿Qué día viajas?" y la tarjeta "Viajas…".
- Un teléfono que tenía guardada una disponibilidad sin destino, de antes: al
  abrir la pantalla vuelve el formulario con sus datos para elegir el destino.

## Menores

- **Service worker:** `public/sw.js` guarda una copia de todo lo que se pide
  (páginas y archivos de cada versión) y nunca borra nada, porque el nombre del
  caché (`muvia-v1`) no cambia. El espacio que ocupa en el teléfono crece con
  cada despliegue.

## Para después del MVP

- **Disponibilidades programadas:** rutas que el transportista repite todos
  los días o todas las semanas. Es una mejora futura
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
- **Rama `claude/solo-viajes`:** sin modo local. El transportista siempre dice
  hacia dónde va y el match es solo por ruta; se quitan el radio de 40 km, la
  semana y "Renovar una semana más". Con eso "Todo el día" para hoy (8) ya no
  aplica: un viaje vale un solo día.
