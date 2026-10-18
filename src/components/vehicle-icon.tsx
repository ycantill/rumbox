import type { VehicleType } from "@/lib/domain";

// Dibujos de lado (mirando a la derecha) para reconocer el vehículo sin leer.
// Usan currentColor, así que siguen el color del texto en tema claro y oscuro.
const SHAPES: Record<VehicleType, React.ReactNode> = {
  furgon: (
    <>
      <rect x="3" y="5" width="37" height="21" rx="2" />
      <path d="M40 11h11l8 8v7H40z" />
      <path d="M44 14h6l5 5H44z" />
    </>
  ),
  estacas: (
    <>
      <path d="M3 26h37M4 8v18M14 8v18M24 8v18M34 8v18M4 8h30M4 17h30" />
      <path d="M40 11h11l8 8v7H40z" />
      <path d="M44 14h6l5 5H44z" />
    </>
  ),
  pickup: (
    <>
      <path d="M3 26v-9h26V7h12l7 10h11a2 2 0 0 1 2 2v7z" />
      <path d="M32 10h8l4.5 6.5H32z" />
    </>
  ),
};

export function VehicleIcon({ type, className }: { type: VehicleType; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[type]}
      {[14, 49].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="31" r="5" />
          <circle cx={cx} cy="31" r="1.6" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
