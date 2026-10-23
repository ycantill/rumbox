-- Reportes y números bloqueados (Yohany, 23 de octubre de 2026).
--
-- El cliente puede reportar a un transportista de su lista ("Reportar") y el
-- transportista, el número que lo llamó ("Reportar un número"). Yohany los
-- revisa en Supabase, en la vista `reportes_por_numero`, y si un número abusa
-- lo agrega a `blocked_phones`: ese número ya no puede ponerse disponible y,
-- si ya lo estaba, deja de salirles a los clientes.
--
-- Del que reporta no se guarda nada suyo: solo su solicitud o su
-- disponibilidad, para que cada uno reporte una sola vez al mismo. El número
-- reportado sí se guarda, aunque se borre el de su disponibilidad (0009),
-- porque sin él no se puede bloquear. Como todo lo demás, solo lo escribe y lo
-- lee el servidor con la service role key: RLS sin políticas.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reporter text not null check (reporter in ('cliente', 'transportista')),
  reason text not null check (reason in (
    'anticipo', 'no_llego', 'carga', 'pago_falso', 'lugar_raro', 'ilegal', 'maltrato', 'otro'
  )),
  -- El número reportado: el del transportista o el que llamó al transportista.
  reported_whatsapp text not null,
  -- Si reporta el cliente: su solicitud y el transportista que reporta.
  request_id uuid references public.requests(id) on delete set null,
  availability_id uuid references public.availabilities(id) on delete set null,
  -- Si reporta el transportista: su disponibilidad.
  reporter_availability_id uuid references public.availabilities(id) on delete set null,
  check (
    (reporter = 'cliente' and request_id is not null and availability_id is not null)
    or (reporter = 'transportista' and reporter_availability_id is not null)
  )
);

-- Una vez por cada uno: el mismo cliente no reporta dos veces al mismo, ni el
-- mismo transportista al mismo número.
create unique index reports_cliente_una_vez on public.reports (request_id, availability_id)
  where reporter = 'cliente';
create unique index reports_transportista_una_vez on public.reports (reporter_availability_id, reported_whatsapp)
  where reporter = 'transportista';
create index reports_numero_idx on public.reports (reported_whatsapp);

alter table public.reports enable row level security;

-- Los números que no pueden usar Mudavía. Los agrega Yohany a mano en el
-- Table Editor, con el número como se guarda (57 y los 10 dígitos).
create table public.blocked_phones (
  whatsapp text primary key,
  created_at timestamptz not null default now(),
  -- Por qué se bloqueó, para acordarse.
  note text
);

alter table public.blocked_phones enable row level security;

-- Cuántas veces reportaron cada número, por qué y si ya está bloqueado. Se ve
-- en Supabase, en el Table Editor. security_invoker: con la anon key no se
-- puede leer nada por aquí.
create view public.reportes_por_numero with (security_invoker = true) as
select
  r.reported_whatsapp as numero,
  count(*) as reportes,
  count(*) filter (where r.reporter = 'cliente') as de_clientes,
  count(*) filter (where r.reporter = 'transportista') as de_transportistas,
  array_agg(distinct r.reason) as motivos,
  max(r.created_at) as ultimo,
  exists (select 1 from public.blocked_phones b where b.whatsapp = r.reported_whatsapp) as bloqueado
from public.reports r
group by r.reported_whatsapp
order by count(*) desc, max(r.created_at) desc;

revoke all on public.reportes_por_numero from anon, authenticated;
