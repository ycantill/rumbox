# Muvia

Plataforma web (PWA) de mudanzas, fletes y envíos que conecta clientes con
transportistas que tienen espacio libre, ya sea porque están en su ciudad o
porque ya van hacia otro lado. Sin registro, sin comisiones y con conexión
directa por WhatsApp. El piloto es en Córdoba y la Costa (Colombia).

- **Cliente** (`/cotizar`): dice de dónde a dónde, qué va a mover, si necesita
  ayuda para cargar y su WhatsApp. Ve el precio estimado y los transportistas
  que le sirven, y les escribe por WhatsApp. Si un transportista ya va para
  allá, el precio baja hasta un 25%.
- **Transportista** (`/transportista`): se pone disponible desde una fecha con
  su vehículo, el espacio libre y si ayuda a cargar. Mientras está disponible
  ve los clientes que lo esperan, hasta que toque "Ya no recibo más clientes".

El alcance del MVP y lo que queda para después está en
[docs/MVP.md](docs/MVP.md). Las decisiones de producto y las convenciones del
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
   archivos de `supabase/migrations/` (hoy solo `0001_init.sql`). Cada vez que
   aparezca una migración nueva hay que ejecutarla también.

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
| `npm test`          | Pruebas de precios y emparejamiento (Vitest) |

El CI de GitHub corre lint, typecheck, pruebas y build en cada pull request.

## Desplegar en Vercel

1. En [Vercel](https://vercel.com), importa el repositorio
   `ycantill/muvia` (detecta Next.js solo).
2. En **Settings → Environment Variables**, agrega `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` para Production y Preview.
3. Despliega. Cada push a `main` publica en producción y cada pull request
   tiene su vista previa.

Si un cambio trae una migración nueva en `supabase/migrations/`, ejecútala en
Supabase antes de desplegar. Las vistas previas usan la misma base de datos
que producción salvo que configures otra.

## Estructura

```
src/app/                 Páginas: inicio, /cotizar (cliente), /transportista
src/app/actions.ts       Server Actions: ponerse disponible, actualizar, precio
src/components/          Componentes compartidos y dibujos de vehículos
src/lib/domain.ts        Vehículos, espacios, jornadas y sus textos
src/lib/pricing.ts       Tarifa base + modificadores + descuento por ruta
src/lib/matching.ts      Emparejamiento por cercanía y por ruta
src/lib/cities.ts        Municipios del piloto con coordenadas
supabase/migrations/     Esquema de base de datos
public/sw.js             Service worker (PWA)
```
