import type { Metadata } from "next";
import { DriverForm } from "./driver-form";
import { GoToActive } from "@/components/one-at-a-time";
import { TrackVisit } from "@/components/ui";

export const metadata: Metadata = {
  title: "Voy de viaje",
};

export default function DriverPage() {
  return (
    <main className="page">
      <TrackVisit page="transportista" />
      <GoToActive />
      <DriverForm />
    </main>
  );
}
