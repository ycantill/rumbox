-- Límite para el transportista (revisión de seguridad del 20 de octubre de 2026).
--
-- Sin cuenta, cualquiera podía ponerse disponible muchas veces seguidas, con
-- cualquier número (incluso el de otra persona), y cada vez les llegaban avisos
-- a los clientes. El servidor cuenta las disponibilidades recientes de cada
-- teléfono y de cada conexión, como ya lo hace con las solicitudes (0007). De la
-- conexión solo se guarda una huella (HMAC de la IP), nunca la IP.

alter table public.availabilities add column ip_hash text;

create index availabilities_ip_recent_idx on public.availabilities (ip_hash, created_at);
create index availabilities_whatsapp_recent_idx on public.availabilities (whatsapp, created_at);
