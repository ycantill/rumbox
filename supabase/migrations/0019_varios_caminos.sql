-- Escoger el camino (Yohany, 22 de octubre de 2026).
--
-- Al ponerse disponible, además de la carretera más rápida, el servidor pide
-- otros caminos del mismo viaje (pasando por pueblos de cruce, porque los
-- caminos alternos de OpenRouteService solo sirven hasta 100 km) y los guarda
-- en `route_options`, el más rápido primero. El transportista escoge por cuál
-- va, y ese queda en `route`, que es el que mira el match. Si el servicio no
-- respondió, o la disponibilidad es de antes, queda vacía. Como `route`, no es
-- un dato de la persona: el siguiente que haga el mismo viaje la reusa.

alter table public.availabilities add column if not exists route_options text[];

-- Cuando escoge otro camino, la pantalla del cliente se pone al día por
-- Realtime, como cuando cambia el espacio o por dónde va.
drop trigger if exists availabilities_avisar_cambio on public.availabilities;
create trigger availabilities_avisar_cambio
  after insert or update of status, space, current_city, route on public.availabilities
  for each row execute function public.avisar_cambio_de_transportistas();

-- Para encontrar rápido los caminos guardados del mismo viaje.
create index if not exists availabilities_caminos_idx
  on public.availabilities (origin_city, destination_city, created_at desc)
  where route_options is not null;
