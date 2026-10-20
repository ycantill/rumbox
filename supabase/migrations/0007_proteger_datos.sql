-- Protección de los datos (revisión del 20 de octubre de 2026).
--
-- 1. Límite de solicitudes: alguien podría hacer muchas solicitudes seguidas,
--    con distintas rutas y fechas, para juntar los teléfonos de los
--    transportistas. El servidor cuenta las solicitudes recientes de cada
--    teléfono y de cada conexión. De la conexión solo se guarda una huella
--    (HMAC de la IP), nunca la IP.
-- 2. Canal de Realtime privado: en el canal público cualquiera con la anon key
--    podía mandar mensajes. Ahora el canal es privado: la anon key solo puede
--    escuchar los canales "transportistas-AAAA-MM-DD" y nadie, salvo la base de
--    datos, puede escribir en ellos.

alter table public.requests add column ip_hash text;

create index requests_ip_recent_idx on public.requests (ip_hash, created_at);
create index requests_whatsapp_recent_idx on public.requests (whatsapp, created_at);

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
  return null;
exception when others then
  -- Si Realtime falla, el transportista igual queda guardado: la pantalla del
  -- cliente se pone al día sola cada minuto.
  raise warning 'avisar_cambio_de_transportistas: %', sqlerrm;
  return null;
end;
$$;

-- Solo se dispara como trigger: nadie la llama desde afuera.
revoke execute on function public.avisar_cambio_de_transportistas() from public, anon, authenticated;

-- Escuchar sí; escribir no (no hay política de insert).
create policy "escuchar cambios de transportistas"
  on realtime.messages
  for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'transportistas-%'
  );
