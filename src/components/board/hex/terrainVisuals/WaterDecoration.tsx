export interface TerrainVisualProps {
  size: number;
}

// Fixed (non-random) ripple rows as fractions of `size` — deterministic
// so server/client SSR render identically.
const RIPPLES: Array<{ dy: number; amplitude: number; opacity: number }> = [
  { dy: -0.35, amplitude: 0.14, opacity: 0.5 },
  { dy: -0.05, amplitude: 0.18, opacity: 0.65 },
  { dy: 0.25, amplitude: 0.15, opacity: 0.5 },
  { dy: 0.5, amplitude: 0.12, opacity: 0.4 },
];

/** Gentle ripple lines suggesting moving water — Água. */
export function WaterDecoration({ size }: TerrainVisualProps) {
  const w = size * 0.85;

  return (
    <g stroke="#cdeeff" strokeWidth={size * 0.035} strokeLinecap="round" fill="none">
      {RIPPLES.map((r, i) => {
        const amp = size * r.amplitude;
        const y = size * r.dy;
        return (
          <path
            key={i}
            opacity={r.opacity}
            d={`M ${-w} ${y} Q ${-w / 2} ${y - amp} 0 ${y} T ${w} ${y}`}
          />
        );
      })}
    </g>
  );
}
