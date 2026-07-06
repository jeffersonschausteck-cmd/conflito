import type { ReactNode } from "react";
import { boardPixelSize } from "@/services/hexGeometry";
import { TerrainLayer } from "./TerrainLayer";
import type { MapDefinition } from "@/maps/types";

/** Reference hex size used to compute the SVG viewBox. The SVG scales
 * responsively via `width: 100%` + `height: 100%` + `viewBox` (like
 * `object-fit: contain`), so this number never needs to change for
 * different screen sizes — only for the visual density of a given map. */
export const HEX_SIZE = 42;

export interface HexBoardProps {
  map: MapDefinition;
  selectedTile?: { row: number; col: number } | null;
  legalTiles?: Set<string>;
  isDimmed?: (row: number, col: number) => boolean;
  onTileClick?: (row: number, col: number) => void;
  /** Extra SVG content stacked above the terrain (pieces, effects). */
  children?: ReactNode;
}

/**
 * "Mapa" layer — the root of the modular board. Computes the drawing
 * surface from the map's own dimensions and renders the terrain grid;
 * everything above it (pieces, effects) shares the same coordinate
 * system via `children`, so a new map size or shape never requires
 * touching any other component.
 */
export function HexBoard({
  map,
  selectedTile,
  legalTiles,
  isDimmed,
  onTileClick,
  children,
}: HexBoardProps) {
  const { width, height } = boardPixelSize(map.rows, map.cols, HEX_SIZE);

  return (
    <div className="relative mx-auto h-full w-full max-w-[1400px] min-h-0 min-w-0 rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-3 shadow-[0_0_60px_rgba(0,255,255,0.08)]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full select-none"
      >
        <TerrainLayer
          map={map}
          size={HEX_SIZE}
          selectedTile={selectedTile}
          legalTiles={legalTiles}
          isDimmed={isDimmed}
          onTileClick={onTileClick}
        />
        {children}
      </svg>
    </div>
  );
}
