-- El cliente también elige la jornada: "Por la mañana", "Por la tarde", "Por
-- la noche" o "Todo el día". Solo le salen transportistas de la misma jornada,
-- y "Todo el día" coincide con todas. Las solicitudes de antes quedan sin
-- jornada y coinciden con todas.

alter table public.requests add column time_slot text
  check (time_slot in ('manana','tarde','noche','todo_el_dia'));
