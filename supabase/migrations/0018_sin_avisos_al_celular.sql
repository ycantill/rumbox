-- Sin avisos al celular (Yohany, 22 de octubre de 2026).
--
-- El cliente ya no pide "Sí, avísame": en iPhone había que agregar Mudavía a
-- la pantalla de inicio y era muy complicado. Él revisa la app cada tanto y,
-- con la pantalla abierta, la lista se pone al día sola. Las suscripciones
-- guardadas sobran. El canal de Realtime y su trigger se quedan.

-- Lo mismo que en 0016, sin las suscripciones.
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
     set whatsapp = null, ip_hash = null, current_city = null
   where (whatsapp is not null or ip_hash is not null or current_city is not null)
     and status = 'llena' and created_at < hace_una_hora;
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;

drop table if exists public.push_subscriptions;
