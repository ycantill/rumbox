import { Signal, Symbol } from "@/components/ui";

/** "Buscando conductores", a pantalla completa mientras se guarda la solicitud. */
export function SearchingDrivers({ from, to }: { from?: string; to?: string }) {
  return (
    <div role="status" className="flex min-h-[70vh] flex-col items-center justify-center gap-7 text-center">
      <span className="grid size-[90px] place-items-center">
        <Signal size={70}>
          <Symbol size={64} />
        </Signal>
      </span>
      <p className="font-display text-[32px] font-black uppercase leading-none">Buscando conductores</p>
      <p className="text-[15px] text-muted">
        {from} → {to}
      </p>
    </div>
  );
}

/** Mientras no hay conductores: la solicitud quedó guardada y seguimos buscando. */
export function StillSearching() {
  return (
    <section role="status" className="flex flex-col items-center gap-3.5 rounded-lg bg-notice px-[22px] py-8 text-center">
      <span className="grid size-[84px] place-items-center">
        <Signal size={70}>
          <Symbol size={60} />
        </Signal>
      </span>
      <h2 className="font-display text-[30px] font-black uppercase leading-none">Buscando conductores...</h2>
      <p className="text-base leading-normal text-[#4a5568] text-pretty">
        Su solicitud quedó guardada. Cuando un conductor vaya para allá, le sale aquí para que lo llame o le escriba por
        WhatsApp.
      </p>
      <p className="self-stretch border-t border-[#e3d9c6] pt-3.5 text-[15px] font-bold leading-snug">
        Entre a Rumbox cada tanto para mirar.
      </p>
    </section>
  );
}
