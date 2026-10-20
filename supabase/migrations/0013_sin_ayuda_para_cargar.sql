-- Sin ayuda para cargar (Yohany, 20 de octubre de 2026).
--
-- Ya no se pregunta si el transportista ayuda a cargar ni si el cliente
-- necesita ayuda: lo hablan por teléfono, como el precio. La columna `labor`
-- queda para lo guardado antes y lo nuevo la deja vacía.

alter table public.availabilities alter column labor drop not null;
alter table public.requests alter column labor drop not null;
