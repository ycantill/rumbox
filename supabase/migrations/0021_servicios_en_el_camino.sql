-- Servicios en el camino (Yohany, 28 de octubre de 2026).
--
-- Ya no se pregunta el espacio ni el tamaño de la mudanza: lo hablan por
-- teléfono. El que viaja cambia "¿Qué servicios hace ahora?" durante el viaje
-- (si se llena, quita mudanzas y fletes). Como antes con el espacio, la
-- pantalla del cliente se pone al día por Realtime cuando cambian sus
-- servicios. Las columnas `space`, `full_space` y `volume` quedan en la base
-- con un valor fijo en lo nuevo.

drop trigger if exists availabilities_avisar_cambio on public.availabilities;
create trigger availabilities_avisar_cambio
  after insert or update of status, space, current_city, route, services on public.availabilities
  for each row execute function public.avisar_cambio_de_transportistas();
