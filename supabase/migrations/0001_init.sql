-- Muvia: esquema inicial del MVP.
-- Modelo "Cero Registros": no hay usuarios ni contraseñas. El número de
-- WhatsApp identifica cada publicación, y el transportista administra la suya
-- con un token secreto que solo vive en su navegador (guardamos su hash).
-- Todo el acceso pasa por el servidor de Next.js con la service role key, así
-- que RLS queda activado sin políticas públicas.

create extension if not exists pgcrypto;

create table public.availabilities (
  id uuid primary key default gen_random_uuid(),
  origin_city text not null,
  destination_city text,               -- null = Modo "Disponible" (local)
  service_date date not null,
  time_slot text not null check (time_slot in ('manana','tarde','noche','todo_el_dia')),
  vehicle_type text not null check (vehicle_type in ('furgon','estacas','pickup','carro')),
  space text not null check (space in ('camion_entero','medio_camion','solo_paquetes','baul','asientos')),
  labor text not null check (labor in ('solo_manejo','yo_ayudo','con_ayudante')),
  whatsapp text not null,
  photo_url text,
  status text not null default 'activa' check (status in ('activa','llena')),
  edit_token_hash text not null,
  created_at timestamptz not null default now()
);

create index availabilities_search_idx
  on public.availabilities (service_date, status);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  origin_city text not null,
  destination_city text not null,
  service_date date not null,
  volume text not null check (volume in ('sobres','carga_parcial','medio_camion','camion_entero')),
  labor text not null check (labor in ('yo_cargo','conductor','ayudantes')),
  stairs_origin smallint not null default 0 check (stairs_origin between 0 and 30),
  stairs_destination smallint not null default 0 check (stairs_destination between 0 and 30),
  whatsapp text not null,
  estimated_price integer not null,
  status text not null default 'abierta' check (status in ('abierta','cerrada')),
  created_at timestamptz not null default now()
);

create index requests_search_idx
  on public.requests (service_date, status);

-- Reseñas post-servicio (sección 9). Se llenará cuando exista el envío
-- automático por WhatsApp 24 h después del viaje.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availabilities(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.availabilities enable row level security;
alter table public.requests enable row level security;
alter table public.reviews enable row level security;
