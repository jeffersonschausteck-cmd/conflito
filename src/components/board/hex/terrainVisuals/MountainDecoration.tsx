export interface TerrainVisualProps {
  size: number;
}

// Fixed (non-random) rock offsets as fractions of `size` — deterministic
// so server/client SSR render identically.
const ROCKS: Array<{ dx: number; dy: number; scale: number; dark: boolean }> = [
  { dx: -0.05, dy: 0.1, scale: 1, dark: false },
  { dx: -0.45, dy: 0.4, scale: 0.7, dark: true },
  { dx: 0.4, dy: 0.35, scale: 0.75, dark: true },
];

function Rock({ x, y, scale, dark }: { x: number; y: number; scale: number; dark: boolean }) {
  const s = scale;
  const base = dark ? "#5f594e" : "#8a8377";
  const highlight = dark ? "#77705f" : "#a89f8d";

  const points = [
    [0, -40 * s],
    [30 * s, -8 * s],
    [22 * s, 28 * s],
    [-22 * s, 30 * s],
    [-32 * s, -6 * s],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");

  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points={points} fill={base} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
      <polygon points={`0,${-40 * s} ${22 * s},${-6 * s} ${2 * s},${4 * s}`} fill={highlight} opacity={0.6} />
    </g>
  );
}

/** Rocks and stones clustered on the hex — Montanha. */
export function MountainDecoration({ size }: TerrainVisualProps) {
  return (
    <g>
      {ROCKS.map((r, i) => (
        <Rock key={i} x={size * r.dx} y={size * r.dy} scale={r.scale * (size / 60)} dark={r.dark} />
      ))}
    </g>
  );
}
