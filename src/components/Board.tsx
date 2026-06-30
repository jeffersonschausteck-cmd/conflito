import { useCallback } from "react";
import { Tile } from "@/components/Tile";
import { useBoard } from "@/hooks/useBoard";
import type {
  BoardAction,
  BoardState,
  Tile as TileModel,
} from "@/types/board";

export interface BoardProps {
  /** Override default 10. */
  rows?: number;
  cols?: number;
  /** Forwarded to useBoard for future multiplayer transport. */
  onAction?: (action: BoardAction, next: BoardState) => void;
  /** Fired after the engine processes a tile click. */
  onTileSelected?: (tile: TileModel, state: BoardState) => void;
}

/**
 * 10x10 board grid. Owns no game rules — only selection state.
 * Pieces, movement, and turn logic plug in later via the engine.
 */
export function Board({ rows = 10, cols = 10, onAction, onTileSelected }: BoardProps) {
  const { state, selectTile } = useBoard({ rows, cols, onAction });

  const handleTileClick = useCallback(
    (tile: TileModel) => {
      // Re-clicking the active tile keeps the selection (idempotent);
      // any other tile moves the selection to it.
      selectTile(tile.id);
      onTileSelected?.(tile, state);
    },
    [selectTile, onTileSelected, state],
  );

  return (
    <div
      role="grid"
      aria-rowcount={rows}
      aria-colcount={cols}
      aria-label="Game board"
      className="relative w-full max-w-[min(90vh,90vw)] mx-auto p-3 rounded-lg border border-cyan-500/30 bg-slate-950/70 backdrop-blur-sm shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)]"
    >
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {state.tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} onClick={handleTileClick} />
        ))}
      </div>
    </div>
  );
}
