-- La ruta por carretera (Yohany, 21 de octubre de 2026).
--
-- Al ponerse disponible, el servidor le pide a OpenRouteService la carretera
-- del viaje y la guarda en `route`, como una línea de puntos codificada
-- (polyline, `src/lib/path.ts`). Con ella salen los pueblos de "¿Por dónde
-- vas?" y el match mira la carretera en vez de la línea recta. Si el servicio
-- no responde, o la disponibilidad es de antes, queda vacía y se usa la línea
-- recta. No es un dato de la persona: solo dice por dónde va la carretera
-- entre dos municipios, y la reusa el siguiente que haga el mismo viaje.

alter table public.availabilities add column if not exists route text;

create index if not exists availabilities_ruta_idx
  on public.availabilities (origin_city, destination_city, created_at desc)
  where route is not null;
