-- "Cualquier día" en la solicitud del cliente y disponibilidades que no
-- vencen (Yohany, 21 de octubre de 2026).
--
-- En "¿Qué día?" el cliente tiene la opción "Cualquier día", que viene
-- elegida. Esas solicitudes no tienen día: `service_date` queda vacío. Le
-- sirven los transportistas de cualquier día y no se vencen: siguen abiertas
-- hasta que el cliente dice "Ya no necesito este servicio". Por eso
-- `borrar_telefonos_vencidos()` no las toca mientras estén abiertas
-- (`service_date < hoy` no se cumple con la fecha vacía).
--
-- La disponibilidad del transportista tampoco se vence: el día que elige es
-- desde cuándo viaja, y sigue encendida hasta "Ya no estoy disponible". Su
-- teléfono se borra solo una hora después de apagarla.

alter table public.requests alter column service_date drop not null;

-- Como un transportista ahora le sirve a los clientes de su día y de los
-- siguientes, la pantalla del cliente escucha un solo canal que recibe los
-- cambios de todos los días. El canal de cada día se sigue mandando para las
-- pantallas abiertas con la versión de antes. La política de 0007 ya deja
-- escuchar cualquier canal "transportistas-%".
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
    true
  );
  perform realtime.send(
    '{}'::jsonb,
    'cambio',
    'transportistas-cualquier_dia',
    true
  );
  return null;
exception when others then
  -- Si Realtime falla, el transportista igual queda guardado: la pantalla del
  -- cliente se pone al día sola cada minuto.
  raise warning 'avisar_cambio_de_transportistas: %', sqlerrm;
  return null;
end;
$$;

revoke execute on function public.avisar_cambio_de_transportistas() from public, anon, authenticated;

-- Lo mismo que en 0014, sin vencer las disponibilidades por su día.
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
     and status = 'llena' and created_at < hace_una_hora;

  delete from public.push_subscriptions s
   using public.requests r
   where s.request_id = r.id
     and (r.service_date < hoy or r.status = 'cerrada');
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;

-- Las que ya se vencieron con la regla de antes quedan apagadas: muchas ya
-- no tienen teléfono y no se pueden volver a encender.
update public.availabilities
   set status = 'llena'
 where status = 'activa'
   and service_date < (now() at time zone 'America/Bogota')::date;
