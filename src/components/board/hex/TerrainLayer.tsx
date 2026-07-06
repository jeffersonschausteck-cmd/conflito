import { hexToPixel } from "@/services/hexGeometry";
import { HexTile } from "./HexTile";
import type { MapDefinition } from "@/maps/types";

export interface TerrainLayerProps {
  map: MapDefinition;
  size: number;
  selectedTile?: { row: number; col: number } | null;
  legalTiles?: Set<string>;
  isDimmed?: (row: number, col: number) => boolean;
  onTileClick?: (row: number, col: number) => void;
}

/**
 * Renders one HexTile per cell of the map's terrain grid. Entirely
 * data-driven from `MapDefinition` — supporting a new map size or a
 * new terrain type never requires touching this component.
 */
export function TerrainLayer({
  map,
  size,
  selectedTile,
  legalTiles,
  isDimmed,
  onTileClick,
}: TerrainLayerProps) {
  const tiles = [];
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const { x, y } = hexToPixel(row, col, size);
      const key = `${row}-${col}`;
      tiles.push(
        <HexTile
          key={key}
          row={row}
          col={col}
          x={x}
          y={y}
          size={size}
          terrain={map.tiles[row]?.[col] ?? "grass"}
          selected={selectedTile?.row === row && selectedTile?.col === col}
          highlighted={legalTiles?.has(key) ?? false}
          dimmed={isDimmed?.(row, col) ?? false}
          onClick={onTileClick}
        />,
      );
    }
  }
  return <>{tiles}</>;
}
