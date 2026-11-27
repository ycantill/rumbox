import type { Service } from "@/lib/domain";

/** La solicitud que el cliente tiene abierta, guardada en su teléfono. Una a la vez. */
export type MyRequest = {
  id: string;
  editToken: string;
  origin: string;
  destination: string;
  date: string;
  /** Lo que necesita. Las guardadas antes de los servicios no lo tienen. */
  service?: Service;
};
