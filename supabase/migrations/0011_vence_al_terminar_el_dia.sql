-- Una solicitud o una disponibilidad vale hasta que termina el día del viaje,
-- a la medianoche en hora de Colombia (Yohany, 20 de octubre de 2026). Antes
-- valía ese día y 24 horas más.
--
-- Cambia solo cuándo se borran los teléfonos: desde el día siguiente al viaje,
-- no desde dos días después. Lo demás queda como en 0009.

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
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;

-- Lo de ayer, que ya se venció con la regla nueva, se borra de una vez.
select public.borrar_telefonos_vencidos();
