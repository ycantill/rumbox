-- "Cualquier día" en la solicitud del cliente (Yohany, 21 de octubre de 2026).
--
-- En "¿Qué día?" el cliente tiene la opción "Cualquier día", que viene
-- elegida. Esas solicitudes no tienen día: `service_date` queda vacío. Le
-- sirven los transportistas de cualquier día y no se vencen: siguen abiertas
-- hasta que el cliente dice "Ya no necesito este servicio". Por eso
-- `borrar_telefonos_vencidos()` no las toca mientras estén abiertas
-- (`service_date < hoy` no se cumple con la fecha vacía).

alter table public.requests alter column service_date drop not null;

-- La pantalla de "Cualquier día" escucha un solo canal que recibe los
-- cambios de transportistas de todos los días, además del canal de cada día.
-- La política de 0007 ya deja escuchar cualquier canal "transportistas-%".
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
