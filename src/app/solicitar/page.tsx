import type { Metadata } from "next";
import { ClientForm } from "./client-form";
import { GoToActive } from "@/components/one-at-a-time";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Necesito un servicio",
  description:
    "Pida una mudanza, un flete o una encomienda y hable directo con conductores que ya van para allá.",
};

export default function ClientPage() {
  return (
    <main className="page">
      <TrackVisit page="solicitar" />
      <GoToActive />
      <ClientForm />
    </main>
  );
}
