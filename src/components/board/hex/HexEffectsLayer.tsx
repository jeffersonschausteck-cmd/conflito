import { hexPolygonPoints, hexToPixel } from "@/services/hexGeometry";
import type { CombatResult } from "@/types/combat";

export interface HexEffectsLayerProps {
  size: number;
  lastCombat: CombatResult | null;
  active: boolean;
}

/**
 * "Efeitos" layer — board-level feedback that isn't tied to a single
 * piece or tile's static terrain: currently the brief flash on the
 * tile where the most recent combat happened. Reuses the same
 * `combat-flash` animation the square board already used.
 */
export function HexEffectsLayer({ size, lastCombat, active }: HexEffectsLayerProps) {
  if (!lastCombat || !active) return null;

  const { x, y } = hexToPixel(lastCombat.tile.row, lastCombat.tile.column, size);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="combat-flash"
      style={{ pointerEvents: "none" }}
    >
      <polygon
        points={hexPolygonPoints(size * 0.96)}
        fill="rgba(217,70,239,0.35)"
        stroke="rgba(217,70,239,0.8)"
        strokeWidth={2}
      />
    </g>
  );
}
