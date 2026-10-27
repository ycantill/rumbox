-- Servicios (Yohany, 27 de octubre de 2026, con el diseño de Rumbox).
--
-- El cliente elige qué necesita: una mudanza, un flete, una encomienda, un
-- encargo o una diligencia (`requests.service`). El que viaja marca los que
-- hace (`availabilities.services`), y solo le salen los clientes que piden
-- uno de esos. Lo guardado antes queda vacío: las solicitudes de antes le
-- sirven a cualquiera, y las disponibilidades de antes hacen todo.

alter table public.requests add column if not exists service text
  check (service in ('mudanza','flete','encomienda','encargo','diligencia'));

alter table public.availabilities add column if not exists services text[]
  check (
    cardinality(services) > 0
    and services <@ array['mudanza','flete','encomienda','encargo','diligencia']
  );
