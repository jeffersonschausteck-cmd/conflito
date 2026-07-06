export interface TerrainVisualProps {
  size: number;
}

// Fixed (non-random) blade offsets as fractions of `size` — deterministic
// so server/client SSR render identically and the art is testable.
const BLADES: Array<{ dx: number; dy: number; rotate: number; scale: number }> = [
  { dx: -0.55, dy: 0.35, rotate: -12, scale: 1 },
  { dx: -0.2, dy: 0.55, rotate: 8, scale: 0.85 },
  { dx: 0.3, dy: 0.45, rotate: -6, scale: 0.9 },
  { dx: 0.55, dy: 0.1, rotate: 14, scale: 0.8 },
  { dx: 0.1, dy: -0.3, rotate: -10, scale: 0.75 },
  { dx: -0.45, dy: -0.2, rotate: 6, scale: 0.7 },
  { dx: 0.45, dy: -0.45, rotate: -14, scale: 0.85 },
];

/** Subtle grass blade texture — low opacity so it reads as a surface, not clutter. */
export function GrassTexture({ size }: TerrainVisualProps) {
  return (
    <g opacity={0.35} stroke="#8fd18f" strokeWidth={size * 0.03} strokeLinecap="round" fill="none">
      {BLADES.map((b, i) => {
        const len = size * 0.22 * b.scale;
        return (
          <path
            key={i}
            transform={`translate(${size * b.dx}, ${size * b.dy}) rotate(${b.rotate})`}
            d={`M 0 0 Q ${len * 0.3} ${-len * 0.6} 0 ${-len}`}
          />
        );
      })}
    </g>
  );
}
