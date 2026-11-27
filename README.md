# Rumbox

Plataforma web (PWA) que conecta a quien necesita una mudanza, un flete o una
encomienda con conductores de furgones y camiones de estacas que ya van de
viaje hacia otro lado. Sin registro, sin comisiones y con contacto directo por
llamada o WhatsApp, en Colombia. Todavía no está definido dónde será el
piloto.

- **Cliente** (`/solicitar`): dice qué servicio necesita, de dónde a dónde y
  qué día (o "Cualquier día"). No da su teléfono. Ve los conductores que le
  sirven, los llama o les escribe por WhatsApp y acuerdan el precio. Si no
  hay nadie, su solicitud queda guardada y la lista se actualiza sola.
- **Conductor** (`/transportista`, "Voy de viaje"): se pone disponible para
  un viaje (de dónde sale, hacia dónde va o "Cualquier destino", desde qué
  día y qué servicios hace) y deja su teléfono. Sigue disponible hasta que
  toque "Ya no estoy disponible". Durante el viaje marca por dónde va y
  cambia los servicios que hace (si se llena, quita mudanzas y fletes).

El alcance del MVP y lo que queda para después está en
[docs/MVP.md](docs/MVP.md). La visión de negocio (modelo, monetización y
roadmap) es privada y no está en este repositorio. Las decisiones de producto y las convenciones del
código están en [CLAUDE.md](CLAUDE.md).

## Stack

- **Next.js 16** (App Router, TypeScript) con Server Actions
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL)
- **Vercel** para el hosting

## Correr en local

Necesitas **Node.js 20 o superior** (el CI usa Node 22) y una cuenta gratuita
en [Supabase](https://supabase.com).

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en Supabase y activa la extensión **pg_cron**
   (Database → Extensions). En el **SQL Editor**, ejecuta en orden los
   archivos de `supabase/migrations/`, desde `0001_init.sql` hasta la última
   (hoy `0023_solo_carga.sql`). Cada vez que aparezca una migración nueva hay
   que ejecutarla también.

3. Copia `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   y llena estas dos variables con los datos de **Project Settings → API** en
   Supabase:

   ```
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<tu service role key>
   ```

   La service role key es secreta: solo se usa en el servidor, nunca lleva el
   prefijo `NEXT_PUBLIC_` y `.env.local` no se sube al repositorio.

   Para que la lista del cliente se actualice sola, llena también la variable
   de Realtime que explica `.env.example`. Sin ella la app funciona igual y la
   lista se pone al día cada minuto.

4. Arranca el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   y abre http://localhost:3000.

## Scripts

| Comando             | Qué hace                                     |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                       |
| `npm run build`     | Build de producción                          |
| `npm start`         | Sirve el build de producción                 |
| `npm run lint`      | ESLint                                       |
| `npm run typecheck` | Verificación de tipos                        |
| `npm test`          | Pruebas del emparejamiento y el vocabulario  |
| `npm run db:start`  | Supabase local en Docker, con las migraciones |
| `npm run test:e2e`  | Pruebas E2E con Playwright (Supabase local)  |
| `npm run db:stop`   | Apaga el Supabase local                      |

El CI de GitHub corre lint, typecheck, pruebas y build en cada pull request,
y las pruebas E2E contra un Supabase local (necesitan Docker si las corres en tu
computador: `npm run db:start` y luego `npm run test:e2e`).

## Desplegar en Vercel

1. En [Vercel](https://vercel.com), importa el repositorio
   `ycantill/muvia` (detecta Next.js solo).
2. En **Settings → Environment Variables**, agrega `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` para Production y Preview, y las de
   `.env.example`: la de Realtime (`SUPABASE_ANON_KEY`) y la de la ruta por
   carretera (`OPENROUTESERVICE_API_KEY`).
3. Despliega. Cada push a `main` publica en producción y cada pull request
   tiene su vista previa.

Si un cambio trae una migración nueva en `supabase/migrations/`, ejecútala en
Supabase antes de desplegar. Las vistas previas usan la misma base de datos
que producción salvo que configures otra.

## Estructura

```
src/app/                 Páginas: inicio, /solicitar (cliente), /transportista (conductor),
                         /ayuda, /privacidad y /terminos
src/app/actions.ts       Server Actions: ponerse disponible, cambiar el viaje, solicitar, cerrar
src/components/          Componentes compartidos
src/lib/domain.ts        Servicios, días, destinos y sus textos
src/lib/matching.ts      Emparejamiento por ruta
src/lib/route.ts         La ruta del transportista pueblo por pueblo (por carretera)
src/lib/cities.ts        Todos los municipios de Colombia y su búsqueda
supabase/migrations/     Esquema: availabilities (viajes), requests (solicitudes), events (analíticas)
docs/                    Alcance del MVP y pendientes
public/sw.js             Service worker (PWA)
```
