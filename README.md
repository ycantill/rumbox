# Muvia

Plataforma web (PWA) de mudanzas, fletes y envíos que conecta clientes con
transportistas que tienen espacio libre, ya sea porque están disponibles en su
ciudad o porque ya van en una ruta. Sin registro, sin comisiones y con
conexión directa por WhatsApp.

El alcance del MVP y lo que queda para después está en
[docs/MVP.md](docs/MVP.md).

## Stack

- **Next.js** (App Router, TypeScript) con Server Actions
- **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **Vercel** para el hosting

## Correr en local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta
   los archivos de `supabase/migrations/` en orden en el SQL Editor.

3. Copia `.env.example` a `.env.local` y llena `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).

4. Arranca:

   ```bash
   npm run dev
   ```

   y abre http://localhost:3000.

## Scripts

| Comando             | Qué hace                                     |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                       |
| `npm run build`     | Build de producción                          |
| `npm run lint`      | ESLint                                       |
| `npm run typecheck` | Verificación de tipos                        |
| `npm test`          | Pruebas de precios y emparejamiento (Vitest) |

## Desplegar en Vercel

1. Importa el repositorio en Vercel (detecta Next.js solo).
2. Agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Settings →
   Environment Variables.
3. Despliega.

## Estructura

```
src/app/                 Páginas: inicio, /cotizar (cliente), /transportista
src/app/actions.ts       Server Actions: publicar, cotizar, "Ruta llena"
src/lib/pricing.ts       Tarifa base + modificadores + descuento por ruta
src/lib/matching.ts      Emparejamiento por zona (local/nacional) y por corredor
src/lib/cities.ts        Municipios del piloto con coordenadas
supabase/migrations/     Esquema de base de datos
public/sw.js             Service worker (PWA)
```
