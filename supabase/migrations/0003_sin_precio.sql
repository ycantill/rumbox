-- En el MVP no se calcula precio: el cliente y el transportista lo acuerdan al
-- hablar. Las solicitudes nuevas dejan el precio vacío y las de antes lo
-- conservan. Las escaleras ya no se preguntan y quedan en 0 (su valor por
-- defecto).

alter table public.requests alter column estimated_price drop not null;
