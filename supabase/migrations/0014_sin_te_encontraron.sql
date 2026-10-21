-- Sin "Te encontraron" (Yohany, 21 de octubre de 2026).
--
-- El transportista ya no ve a los clientes que tocaron su tarjeta ni contesta
-- "Lo llevo": él mismo cambia cuánto espacio le queda en "¿Cuánto espacio te
-- queda?". La tabla `contacts` sobra. `full_space` se queda: es lo que podía
-- llevar al empezar, el tope de esa lista y con lo que vuelve el formulario.

-- Lo mismo que en 0012, sin las filas de `contacts`.
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

drop table public.contacts;
