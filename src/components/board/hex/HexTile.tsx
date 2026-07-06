import { hexPolygonPoints } from "@/services/hexGeometry";
import { TERRAINS } from "@/maps/terrains";
import { TERRAIN_VISUALS } from "./terrainVisuals";
import type { TerrainId } from "@/maps/types";

export interface HexTileProps {
  row: number;
  col: number;
  x: number;
  y: number;
  size: number;
  terrain: TerrainId;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  onClick?: (row: number, col: number) => void;
}

/**
 * A single hexagonal cell. Purely presentational — it only knows how
 * to draw a terrain color and a selection/highlight outline. It has no
 * idea what "legal move" or "combat" mean; that state is handed to it
 * as plain booleans by the layers above.
 */
export function HexTile({
  row,
  col,
  x,
  y,
  size,
  terrain,
  selected = false,
  highlighted = false,
  dimmed = false,
  onClick,
}: HexTileProps) {
  const info = TERRAINS[terrain];
  const points = hexPolygonPoints(size * 0.96);
  const clipId = `hex-clip-${row}-${col}`;
  const Visual = TERRAIN_VISUALS[terrain];

  const stroke = selected
    ? "#22d3ee"
    : highlighted
      ? "#67e8f9"
      : "rgba(0,0,0,0.35)";
  const strokeWidth = selected ? 3 : highlighted ? 2 : 1;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick ? () => onClick(row, col) : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <polygon
        points={points}
        fill={info?.corBase ?? "#3f6b3f"}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={dimmed ? 0.45 : 0.92}
      />

      {/* Decoração do terreno — sempre recortada pelo mesmo hexágono e
          nunca captura cliques, então nunca vaza, esconde peças ou
          interfere na seleção. */}
      {Visual && (
        <>
          <clipPath id={clipId}>
            <polygon points={points} />
          </clipPath>
          <g clipPath={`url(#${clipId})`} style={{ pointerEvents: "none" }} opacity={dimmed ? 0.45 : 1}>
            <Visual size={size} />
          </g>
        </>
      )}
    </g>
  );
}
