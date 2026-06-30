import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Tile as TileModel } from "@/types/board";

export interface TileProps {
  tile: TileModel;
  onClick: (tile: TileModel) => void;
}

/**
 * Pure presentational tile. All state lives in the board engine; this
 * component is just a button. Memoized so a 100-tile grid only
 * re-renders the tiles whose props actually changed.
 */
function TileBase({ tile, onClick }: TileProps) {
  const { row, col, selected, highlighted, occupied } = tile;
  const isDark = (row + col) % 2 === 1;

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Tile ${row + 1}, ${col + 1}`}
      aria-selected={selected}
      data-row={row}
      data-col={col}
      onClick={() => onClick(tile)}
      className={cn(
        // perfect square via aspect-ratio, fills its grid cell
        "relative aspect-square w-full select-none outline-none",
        "border border-cyan-500/15 transition-all duration-150 ease-out",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-cyan-400/70",
        isDark ? "bg-slate-900/60" : "bg-slate-900/30",
        "hover:scale-[1.04] hover:border-cyan-300/70 hover:bg-cyan-400/10",
        "hover:shadow-[0_0_18px_-2px_rgba(34,211,238,0.55)]",
        highlighted &&
          "border-fuchsia-400/70 bg-fuchsia-500/15 shadow-[0_0_14px_-2px_rgba(232,121,249,0.6)]",
        selected &&
          "border-cyan-300 bg-cyan-400/25 shadow-[0_0_22px_-1px_rgba(34,211,238,0.85)] scale-[1.02]",
      )}
    >
      {selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1 border border-cyan-200/80"
        />
      )}
      {occupied && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1/4 rounded-full bg-cyan-300/80"
        />
      )}
    </button>
  );
}

export const Tile = memo(TileBase);
