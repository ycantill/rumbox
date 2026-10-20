-- Analíticas propias (Yohany, 20 de octubre de 2026).
--
-- Para saber si el piloto funciona: cuántas personas abren la app, cuántas
-- vuelven, y cuántas veces un cliente toca "Escribir por WhatsApp" o "Llamar"
-- en la tarjeta de un transportista. No se guarda nada de la persona: ni
-- teléfono, ni conexión, ni un identificador del navegador. Solo qué pasó, en
-- qué pantalla y cuándo. Como todo lo demás, solo lo escribe y lo lee el
-- servidor con la service role key: RLS sin políticas.
--
-- Las solicitudes y las disponibilidades no se cuentan aquí: ya están en sus
-- tablas, y sus filas quedan aunque se borre el teléfono (0009).

create table public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('visita', 'whatsapp', 'llamada')),
  -- En las visitas: qué pantalla se abrió.
  page text check (page in ('inicio', 'solicitar', 'transportista', 'privacidad')),
  -- En las visitas: si ese navegador ya había entrado antes.
  returning_visitor boolean,
  -- En los toques: a qué transportista, para saber de qué municipio.
  availability_id uuid references public.availabilities(id) on delete set null
);

create index events_created_idx on public.events (created_at);

alter table public.events enable row level security;

-- Resumen por día, en hora de Colombia. Se ve en Supabase, en el Table Editor.
-- security_invoker: la vista respeta el RLS de las tablas, así que con la anon
-- key no se puede leer nada por aquí.
create view public.analiticas_por_dia with (security_invoker = true) as
select
  d.dia,
  count(*) filter (where d.kind = 'visita') as visitas,
  count(*) filter (where d.kind = 'visita' and d.returning_visitor) as visitas_de_quienes_vuelven,
  count(*) filter (where d.kind = 'visita' and d.page = 'solicitar') as abren_solicitar,
  count(*) filter (where d.kind = 'visita' and d.page = 'transportista') as abren_transportista,
  (select count(*) from public.requests r
    where (r.created_at at time zone 'America/Bogota')::date = d.dia) as solicitudes,
  (select count(*) from public.availabilities a
    where (a.created_at at time zone 'America/Bogota')::date = d.dia) as disponibilidades,
  count(*) filter (where d.kind = 'whatsapp') as toques_whatsapp,
  count(*) filter (where d.kind = 'llamada') as toques_llamar
from (
  select (created_at at time zone 'America/Bogota')::date as dia, kind, page, returning_visitor
  from public.events
) d
group by d.dia
order by d.dia desc;

-- Resumen por municipio de salida: dónde hay clientes, dónde hay
-- transportistas y dónde se están conectando. Sirve para elegir el piloto.
create view public.analiticas_por_municipio with (security_invoker = true) as
select
  municipio,
  sum(solicitudes) as solicitudes,
  sum(disponibilidades) as disponibilidades,
  sum(contactos) as contactos
from (
  select origin_city as municipio, 1 as solicitudes, 0 as disponibilidades, 0 as contactos
  from public.requests
  union all
  select origin_city, 0, 1, 0
  from public.availabilities
  union all
  select a.origin_city, 0, 0, 1
  from public.events e
  join public.availabilities a on a.id = e.availability_id
  where e.kind in ('whatsapp', 'llamada')
) t
group by municipio
order by sum(solicitudes) + sum(disponibilidades) desc;

revoke all on public.analiticas_por_dia, public.analiticas_por_municipio from anon, authenticated;
