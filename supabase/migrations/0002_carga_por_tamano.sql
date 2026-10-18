-- La carga se mide por tamaño de casa, con la misma lista para el cliente y el
-- transportista. El transportista ya no dice qué vehículo tiene: dice cuánto
-- puede llevar, y ahora también puede elegir "Algunas cosas" (carga_parcial).
-- Las claves de antes siguen permitidas para lo que ya está guardado.

alter table public.availabilities alter column vehicle_type drop not null;

alter table public.availabilities drop constraint availabilities_space_check;
alter table public.availabilities add constraint availabilities_space_check
  check (space in ('camion_entero','medio_camion','carga_parcial','solo_paquetes','baul','asientos'));
