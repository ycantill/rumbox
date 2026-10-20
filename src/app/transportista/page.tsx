import type { Metadata } from "next";
import { DriverForm } from "./driver-form";
import { BackHome, GoToActive } from "@/components/one-at-a-time";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Soy transportista",
};

export default function DriverPage() {
  return (
    <main className="page">
      <TrackVisit page="transportista" />
      <GoToActive />
      <BackHome />
      <h1 className="mb-6 mt-3 text-2xl font-bold">Soy transportista</h1>
      <DriverForm />
    </main>
  );
}
