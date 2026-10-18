-- El cliente puede cerrar su solicitud con "Ya conseguí transportista", y al
-- volver a la pantalla ve su solicitud con los transportistas que le sirven.
-- Como no hay cuentas, la controla con un token que vive en su teléfono, igual
-- que el transportista: aquí se guarda solo el hash. Las solicitudes de antes
-- quedan sin token y se apagan solas cuando pasa el día del viaje.

alter table public.requests add column edit_token_hash text;
