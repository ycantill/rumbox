-- Alcance del transportista (local / nacional), independiente del destino.
-- Antes, no declarar destino equivalía a "Disponible" y aceptaba viajes desde
-- su zona hacia cualquier ciudad; esas filas quedan como 'nacional' para no
-- cambiarles lo que ya veían.
alter table public.availabilities
  add column coverage text not null default 'nacional'
  check (coverage in ('local','nacional'));

comment on column public.availabilities.destination_city is
  'Destino opcional: si existe, activa el Modo Ruta. No define el alcance.';
