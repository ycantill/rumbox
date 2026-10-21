# Mudavía

Plataforma web (PWA) de mudanzas, fletes y envíos que conecta clientes con
transportistas que ya van hacia otro lado y tienen espacio libre. Sin
registro, sin comisiones y con contacto directo por llamada o WhatsApp, en
Colombia. Todavía no está definido dónde será el piloto.

- **Cliente** (`/solicitar`): dice de dónde a dónde, qué día, qué va a
  mover y su teléfono. Ve los
  transportistas que le sirven, los llama o les escribe por WhatsApp y
  acuerdan el precio.
- **Transportista** (`/transportista`): se pone disponible para un viaje (de
  dónde sale, hacia dónde va y qué día) con cuánto puede llevar. Hasta que
  termina el día del viaje, o hasta que toque "Ya no estoy disponible", los
  clientes lo llaman o le escriben, y él cambia cuánto espacio le queda.

El alcance del MVP y lo que queda para después está en
[docs/MVP.md](docs/MVP.md). La visión de negocio completa está en
docs/negocio/. Las decisiones de producto y las convenciones del
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

2. Crea un proyecto en Supabase. En el **SQL Editor**, ejecuta en orden los
   archivos de `supabase/migrations/`, empezando por `0001_init.sql`. Cada vez
   que aparezca una migración nueva hay que ejecutarla también.

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

   Para que la lista del cliente se actualice sola y le lleguen avisos al
   celular, llena también las variables de Realtime y de Web Push que explica
   `.env.example`. Sin ellas la app funciona igual, sin avisos, y la lista se
   pone al día cada minuto. Los avisos solo funcionan con `npm run build` y
   `npm start`, porque el service worker no se registra en desarrollo.

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

El CI de GitHub corre lint, typecheck, pruebas y build en cada pull request.

## Desplegar en Vercel

1. En [Vercel](https://vercel.com), importa el repositorio
   `ycantill/muvia` (detecta Next.js solo).
2. En **Settings → Environment Variables**, agrega `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` para Production y Preview, y las de avisos de
   `.env.example` (`SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`).
3. Despliega. Cada push a `main` publica en producción y cada pull request
   tiene su vista previa.

Si un cambio trae una migración nueva en `supabase/migrations/`, ejecútala en
Supabase antes de desplegar. Las vistas previas usan la misma base de datos
que producción salvo que configures otra.

## Estructura

```
src/app/                 Páginas: inicio, /solicitar (cliente), /transportista
src/app/actions.ts       Server Actions: ponerse disponible, actualizar, solicitar, avisos
src/components/          Componentes compartidos
src/lib/domain.ts        Tamaños de carga y sus textos
src/lib/matching.ts      Emparejamiento por ruta
src/lib/cities.ts        Todos los municipios de Colombia y su búsqueda
supabase/migrations/     Esquema de base de datos
docs/                    Alcance del MVP, pendientes y base de conocimiento de negocio
public/sw.js             Service worker (PWA)
```
