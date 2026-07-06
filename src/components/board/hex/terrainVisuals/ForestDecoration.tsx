export interface TerrainVisualProps {
  size: number;
}

// Fixed (non-random) tree offsets as fractions of `size` — deterministic
// so server/client SSR render identically.
const TREES: Array<{ dx: number; dy: number; scale: number }> = [
  { dx: -0.45, dy: 0.15, scale: 1 },
  { dx: 0.15, dy: -0.4, scale: 0.95 },
  { dx: 0.4, dy: 0.3, scale: 0.8 },
  { dx: -0.15, dy: 0.45, scale: 0.85 },
  { dx: 0.05, dy: -0.02, scale: 1.05 },
];

function Tree({ x, y, scale, size }: { x: number; y: number; scale: number; size: number }) {
  const trunkH = size * 0.22 * scale;
  const trunkW = size * 0.06 * scale;
  const canopyR = size * 0.24 * scale;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-trunkW / 2}
        y={0}
        width={trunkW}
        height={trunkH}
        fill="#5b3d24"
        rx={trunkW * 0.3}
      />
      <circle cy={-canopyR * 0.5} r={canopyR} fill="#245c33" />
      <circle cy={-canopyR * 1.15} cx={canopyR * 0.35} r={canopyR * 0.7} fill="#2e6d3d" />
      <circle cy={-canopyR * 0.9} cx={-canopyR * 0.4} r={canopyR * 0.6} fill="#1d4f2a" />
    </g>
  );
}

/** Trees scattered at fixed positions across the hex — Floresta. */
export function ForestDecoration({ size }: TerrainVisualProps) {
  return (
    <g>
      {TREES.map((t, i) => (
        <Tree key={i} x={size * t.dx} y={size * t.dy} scale={t.scale} size={size} />
      ))}
    </g>
  );
}
