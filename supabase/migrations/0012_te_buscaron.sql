-- "Te buscaron" (Yohany, 20 de octubre de 2026).
--
-- Cuando un cliente toca "Escribir por WhatsApp" o "Llamar" en la tarjeta de
-- un transportista, se guarda qué solicitud buscó a qué disponibilidad. El
-- transportista ve esas solicitudes en su pantalla, con los dos últimos
-- números del teléfono del cliente (nunca el número completo), y contesta
-- "Lo llevo" o "No lo llevo". Como todo lo demás, solo lo escribe y lo lee el
-- servidor con la service role key: RLS sin políticas.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  availability_id uuid not null references public.availabilities(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  -- Vacía hasta que el transportista contesta.
  answer text check (answer in ('lo_llevo', 'no_lo_llevo')),
  -- Un cliente que toca varias veces al mismo transportista sale una sola vez.
  unique (availability_id, request_id)
);

alter table public.contacts enable row level security;

-- Lo que podía llevar al ponerse disponible. Con "Lo llevo", Muvia resta lo
-- que lleva y guarda en `space` lo que le queda, que es lo que miran los
-- clientes. Vacía en las de antes: ahí vale `space`.
alter table public.availabilities add column full_space text;

-- Se borran con los teléfonos: cuando la solicitud o la disponibilidad deja de
-- valer. Si el cliente cierra la solicitud, el "Lo llevo" se queda mientras
-- dure el viaje: es lo que ocupa espacio. Lo demás queda como en 0011.
create or replace function public.borrar_telefonos_vencidos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Lo de antes de hoy ya se venció.
  hoy date := (now() at time zone 'America/Bogota')::date;
  hace_una_hora timestamptz := now() - interval '1 hour';
begin
  update public.requests
     set whatsapp = null, ip_hash = null
   where (whatsapp is not null or ip_hash is not null)
     and (service_date < hoy or (status = 'cerrada' and created_at < hace_una_hora));

  update public.availabilities
     set whatsapp = null, ip_hash = null
   where (whatsapp is not null or ip_hash is not null)
     and (service_date < hoy or (status = 'llena' and created_at < hace_una_hora));

  delete from public.push_subscriptions s
   using public.requests r
   where s.request_id = r.id
     and (r.service_date < hoy or r.status = 'cerrada');

  delete from public.contacts c
   using public.requests r, public.availabilities a
   where c.request_id = r.id
     and c.availability_id = a.id
     and (r.service_date < hoy or a.service_date < hoy or a.status = 'llena'
          or (r.status = 'cerrada' and c.answer is distinct from 'lo_llevo'));
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;
