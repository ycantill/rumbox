-- Limpieza de la base (Yohany, 29 de octubre de 2026).
--
-- Se quitan la tabla y las columnas que ya no usa nadie, de las preguntas
-- que salieron del MVP: el vehículo, la jornada, la ayuda para cargar, las
-- escaleras, el precio, la foto, el espacio, el tamaño de la carga y el
-- teléfono del cliente. También la tabla `reviews`, que nunca se usó (las
-- reseñas automáticas quedaron para después del MVP), y dos índices sin uso.
--
-- Borra datos: lo guardado en esas columnas se pierde. Antes de correrla,
-- conviene sacar una copia (Supabase > Database > Backups).

-- Lo de antes que ya no les salía a los clientes (sin destino, del modo local,
-- o en carro particular, con baúl o asientos) queda apagado, porque sin
-- `space` ya no se puede distinguir.
update public.availabilities
   set status = 'llena'
 where status = 'activa'
   and (destination_city is null or space in ('baul', 'asientos'));

-- El trigger se vuelve a crear sin `space` antes de quitar la columna. Lleva
-- los servicios de la 0021, por si esa no se corrió.
drop trigger if exists availabilities_avisar_cambio on public.availabilities;
create trigger availabilities_avisar_cambio
  after insert or update of status, current_city, route, services on public.availabilities
  for each row execute function public.avisar_cambio_de_transportistas();

-- Lo mismo que en 0018, sin el teléfono del cliente, que ya no existe.
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
     set ip_hash = null
   where ip_hash is not null
     and (service_date < hoy or (status = 'cerrada' and created_at < hace_una_hora));

  update public.availabilities
     set whatsapp = null, ip_hash = null, current_city = null
   where (whatsapp is not null or ip_hash is not null or current_city is not null)
     and status = 'llena' and created_at < hace_una_hora;
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;

alter table public.availabilities
  drop column if exists time_slot,
  drop column if exists vehicle_type,
  drop column if exists labor,
  drop column if exists photo_url,
  drop column if exists space,
  drop column if exists full_space;

-- Con `whatsapp` se va su índice (`requests_whatsapp_recent_idx`).
alter table public.requests
  drop column if exists whatsapp,
  drop column if exists labor,
  drop column if exists stairs_origin,
  drop column if exists stairs_destination,
  drop column if exists estimated_price,
  drop column if exists time_slot,
  drop column if exists volume;

drop table if exists public.reviews;

-- Las solicitudes solo se leen por id, y la carretera guardada se busca por
-- `route_options` (availabilities_caminos_idx).
drop index if exists public.requests_search_idx;
drop index if exists public.availabilities_ruta_idx;
