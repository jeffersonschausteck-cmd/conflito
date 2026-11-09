import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Piece as PieceModel } from "@/types/piece";
import { SpriteIcon } from "@/components/game/SpriteIcon";

export interface PieceProps {
  piece: PieceModel;
  selected?: boolean;
  hidden?: boolean;
  onClick?: (piece: PieceModel) => void;
}

function PieceBase({
  piece,
  selected = false,
  hidden = false,
  onClick,
}: PieceProps) {
  if (!piece.isAlive) return null;

  const isBlue = piece.owner === "blue";

  const stroke = isBlue
    ? "rgb(103,232,249)"
    : "rgb(251,113,133)";

  // Glow externo por equipe (peça é o elemento principal — sem moldura/círculo).
  const glowColor = isBlue ? "#00D7FF" : "#FF4040";

  const label = hidden
    ? `${piece.owner} unknown unit`
    : `${piece.owner} ${piece.pieceType}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      data-selected={selected}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(piece);
      }}
      style={{ "--piece-glow-color": glowColor } as React.CSSProperties}
      className={cn(
        "piece-glow",
        "group",
        "relative",
        "flex",
        "h-[84%]",
        "w-[84%]",
        "items-center",
        "justify-center",
        "outline-none",
        "active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-cyan-300"
      )}
    >
      {hidden ? (
        <UnknownGlyph stroke={stroke} />
      ) : (
        <SpriteIcon
          type={piece.pieceType}
          faction={piece.owner}
          size={72}
        />
      )}
    </button>
  );
}

/** Generic silhouette shown for fog-of-war-hidden enemy pieces. */
function UnknownGlyph({ stroke }: { stroke: string }) {
  const p = {
    fill: "none",
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[72%] w-[72%]"
      aria-hidden
    >
      <polygon
        points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"
        {...p}
      />

      <path
        d="M9.5 10 A2.5 2.5 0 1 1 12 12.5 V14"
        {...p}
      />

      <circle
        cx="12"
        cy="16.5"
        r="0.6"
        fill={stroke}
        stroke="none"
      />
    </svg>
  );
}
export const Piece = memo(PieceBase);
