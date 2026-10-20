import type { Metadata } from "next";
import { ClientForm } from "./client-form";
import { BackHome, GoToActive } from "@/components/one-at-a-time";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Solicitar transportista",
};

export default function ClientPage() {
  return (
    <main className="page">
      <TrackVisit page="solicitar" />
      <GoToActive />
      <BackHome />
      <h1 className="mb-6 mt-3 text-2xl font-bold">Necesito mover algo</h1>
      <ClientForm />
    </main>
  );
}
