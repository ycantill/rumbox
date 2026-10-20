-- Los teléfonos se guardan solo mientras la solicitud o la disponibilidad vale
-- (Yohany, 20 de octubre de 2026). Después se borran, y con ellos la huella de
-- la conexión (`ip_hash`) y las suscripciones a los avisos.
--
-- Deja de valer:
--   - al vencerse: el día del viaje y 24 horas más (en hora de Colombia), o
--   - al cerrarla el cliente ("Ya conseguí transportista", o al hacer otra) o
--     al apagarla el transportista ("Ya no voy a trabajar"). Esas se borran
--     una hora después de creadas, para que el límite por teléfono y por
--     conexión (0007 y 0008) las siga contando en su ventana de una hora.
--
-- Corre cada hora con pg_cron. Si la extensión no está activa, actívala en
-- Supabase (Database > Extensions > pg_cron) antes de correr esta migración.

alter table public.requests alter column whatsapp drop not null;
alter table public.availabilities alter column whatsapp drop not null;

create or replace function public.borrar_telefonos_vencidos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Lo de ayer todavía está dentro de sus 24 horas.
  ayer date := (now() at time zone 'America/Bogota')::date - 1;
  hace_una_hora timestamptz := now() - interval '1 hour';
begin
  update public.requests
     set whatsapp = null, ip_hash = null
   where (whatsapp is not null or ip_hash is not null)
     and (service_date < ayer or (status = 'cerrada' and created_at < hace_una_hora));

  update public.availabilities
     set whatsapp = null, ip_hash = null
   where (whatsapp is not null or ip_hash is not null)
     and (service_date < ayer or (status = 'llena' and created_at < hace_una_hora));

  delete from public.push_subscriptions s
   using public.requests r
   where s.request_id = r.id
     and (r.service_date < ayer or r.status = 'cerrada');
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'borrar-telefonos-vencidos',
  '10 * * * *',
  $$select public.borrar_telefonos_vencidos()$$
);

-- Lo que ya estaba vencido se borra de una vez.
select public.borrar_telefonos_vencidos();
