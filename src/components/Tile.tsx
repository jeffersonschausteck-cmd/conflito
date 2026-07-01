import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Tile as TileModel } from "@/types/board";

export interface TileProps {
  tile: TileModel;
  onClick: (tile: TileModel) => void;
}

/**
 * Casa do tabuleiro.
 * Responsável apenas pela renderização visual.
 * Toda a lógica permanece no Board/GameEngine.
 */
function TileBase({ tile, onClick }: TileProps) {
  const {
    row,
    col,
    selected,
    highlighted,
    occupied,
  } = tile;

  const isDark = (row + col) % 2 === 1;

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Casa ${row + 1}, ${col + 1}`}
      aria-selected={selected}
      data-row={row}
      data-col={col}
      onClick={() => onClick(tile)}
      className={cn(
        "group relative aspect-square w-full overflow-hidden select-none outline-none",

        "transition-all duration-200 ease-out",

        "border",

        isDark
          ? "border-slate-700/70 bg-slate-900"
          : "border-slate-700/50 bg-slate-800",

        "hover:z-10",
        "hover:scale-[1.04]",
        "hover:border-cyan-400/70",
        "hover:shadow-[0_0_18px_rgba(34,211,238,0.35)]",

        highlighted &&
        "border-cyan-300 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.55)]",

        selected &&
        "z-20 scale-[1.02] border-cyan-300 bg-cyan-400/25 shadow-[0_0_28px_rgba(34,211,238,0.8)]",

        "focus-visible:ring-2 focus-visible:ring-cyan-300"
      )}
    >
      {/* textura */}
      <div
        className={cn(
          "absolute inset-0 opacity-25",

          isDark
            ? "bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,.04)_50%,transparent_100%)]"
            : "bg-[linear-gradient(45deg,transparent_0%,rgba(255,255,255,.03)_50%,transparent_100%)]"
        )}
      />

      {/* linhas internas */}
      <div className="pointer-events-none absolute inset-1 border border-cyan-500/5 group-hover:border-cyan-400/20" />

      {/* brilho seleção */}
      {selected && (
        <>
          <div className="absolute inset-0 animate-pulse rounded-sm border border-cyan-300" />

          <div className="absolute inset-2 border border-cyan-200/70" />
        </>
      )}

      {/* casa válida */}
      {highlighted && (
        <>
          <div className="absolute inset-0 rounded-sm bg-cyan-400/10" />

          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300 bg-cyan-300/70 shadow-[0_0_14px_rgba(34,211,238,.8)]" />
        </>
      )}

      {/* ocupada */}
      {occupied && (
        <div className="pointer-events-none absolute inset-2 rounded-full border border-cyan-400/10 bg-cyan-300/5" />
      )}

      {/* brilho hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.15),transparent_70%)]" />
      </div>
    </button>
  );
}

export const Tile = memo(TileBase);