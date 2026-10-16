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
  carro: (
    <>
      <path d="M3 26v-5a3 3 0 0 1 3-3h9l7-8h18l8 8h8a3 3 0 0 1 3 3v5z" />
      <path d="M23 12.5h7.5V17H19zM33 12.5h6.5L44 17H33z" />
    </>
  ),
};

export function VehicleIcon({ type, className }: { type: VehicleType; className?: string }) {
  const [rear, front] = type === "carro" ? [16, 48] : [14, 49];
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
      {[rear, front].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="31" r="5" />
          <circle cx={cx} cy="31" r="1.6" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
