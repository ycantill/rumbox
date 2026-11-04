-- Solo carga (Yohany, 4 de noviembre de 2026).
--
-- El MVP se enfoca en furgones y camiones de estacas: salen los encargos y
-- las diligencias. Quedan la mudanza, el flete y la encomienda.
--
-- Lo guardado con ellos:
-- - Las solicitudes abiertas de un encargo o una diligencia se cierran. El
--   teléfono del cliente las olvida y le vuelve el formulario.
-- - El que viaja deja de hacerlos. Si solo hacía eso, su disponibilidad se
--   apaga y le vuelve el formulario para elegir otra vez.

update public.requests
   set status = 'cerrada'
 where status = 'abierta'
   and service in ('encargo', 'diligencia');

update public.availabilities
   set status = 'llena'
 where status = 'activa'
   and services is not null
   and services <@ array['encargo', 'diligencia'];

-- La revisión de `cardinality(services) > 0` obliga a dejar uno: a las que se
-- quedan sin ninguno (ya apagadas arriba) se les deja vacío (null).
update public.availabilities
   set services = nullif(array_remove(array_remove(services, 'encargo'), 'diligencia'), '{}')
 where services && array['encargo', 'diligencia'];

-- La base ya no acepta esos servicios. Los nombres de las revisiones son los
-- que Postgres les puso en 0020. Las solicitudes cerradas conservan su
-- servicio, para las cuentas: la revisión vale para lo nuevo (`not valid`).
alter table public.requests drop constraint if exists requests_service_check;
alter table public.requests add constraint requests_service_check
  check (service in ('mudanza', 'flete', 'encomienda')) not valid;

alter table public.availabilities drop constraint if exists availabilities_services_check;
alter table public.availabilities add constraint availabilities_services_check
  check (
    cardinality(services) > 0
    and services <@ array['mudanza', 'flete', 'encomienda']
  );
