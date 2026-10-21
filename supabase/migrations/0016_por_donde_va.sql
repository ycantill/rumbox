-- Por dónde va el transportista (Yohany, 21 de octubre de 2026).
--
-- En su pantalla ve su ruta pueblo por pueblo y, con la ubicación del
-- teléfono, marca por dónde va. Se guarda solo el municipio más cercano
-- (`current_city`, un slug como `origin_city`): las coordenadas no salen del
-- teléfono. Con eso deja de salirles a los clientes cuyo pueblo ya dejó atrás.
-- El cliente no lo ve (Yohany): solo sirve para el emparejamiento.

alter table public.availabilities add column if not exists current_city text;

-- Cuando avanza, la pantalla del cliente se pone al día por Realtime, como
-- cuando cambia el espacio. El servidor solo lo guarda si cambió de municipio.
drop trigger if exists availabilities_avisar_cambio on public.availabilities;
create trigger availabilities_avisar_cambio
  after insert or update of status, space, current_city on public.availabilities
  for each row execute function public.avisar_cambio_de_transportistas();

-- Lo mismo que en 0015, y por dónde iba también se borra al apagarse.
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

  delete from public.push_subscriptions s
   using public.requests r
   where s.request_id = r.id
     and (r.service_date < hoy or r.status = 'cerrada');
end;
$$;

revoke execute on function public.borrar_telefonos_vencidos() from public, anon, authenticated;
