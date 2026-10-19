-- Avisos para el cliente cuando aparece un transportista que le sirve.
--
-- 1. Avisos al celular (Web Push): cada teléfono que acepta los avisos guarda
--    aquí su suscripción, ligada a la solicitud abierta. Como todo lo demás,
--    solo la lee el servidor con la service role key: RLS sin políticas.
-- 2. Pantalla al día (Realtime): cuando un transportista se pone disponible o
--    cambia la suya, se manda un mensaje sin datos al canal público del día
--    del viaje ("transportistas-AAAA-MM-DD"). La pantalla del cliente que
--    escucha ese día vuelve a pedir su lista al servidor. El mensaje no lleva
--    teléfonos ni ciudades, así que no expone nada.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_request_idx on public.push_subscriptions (request_id);

alter table public.push_subscriptions enable row level security;

create or replace function public.avisar_cambio_de_transportistas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    '{}'::jsonb,
    'cambio',
    'transportistas-' || new.service_date::text,
    false
  );
  return null;
exception when others then
  -- Si Realtime falla, el transportista igual queda guardado: la pantalla del
  -- cliente se pone al día sola cada minuto.
  raise warning 'avisar_cambio_de_transportistas: %', sqlerrm;
  return null;
end;
$$;

create trigger availabilities_avisar_cambio
  after insert or update of status, space on public.availabilities
  for each row execute function public.avisar_cambio_de_transportistas();
