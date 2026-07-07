import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Piece as PieceModel, PieceType } from "@/types/piece";
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

/* -------------------------------------------------------------------------- */
/*                                  GLYPHS                                    */
/* -------------------------------------------------------------------------- */

interface GlyphProps {
  type: PieceType;
  stroke: string;
}

function PieceGlyph({ type, stroke }: GlyphProps) {
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[74%] w-[74%] drop-shadow-[0_0_6px_currentColor]"
      aria-hidden
    >
      {glyphFor(type, common)}
    </svg>
  );
}

function glyphFor(type: PieceType, p: Record<string, unknown>) {
  switch (type) {

    case "commander":
      return (
        <>
          <polygon
            points="12,3 14,9 20,9 15,13 17,20 12,16 7,20 9,13 4,9 10,9"
            {...p}
          />
        </>
      );

    case "officer":
      return (
        <>
          <polygon
            points="12,4 20,10 17,20 7,20 4,10"
            {...p}
          />
          <circle
            cx="12"
            cy="13"
            r="2"
            {...p}
          />
        </>
      );

    case "scout":
      return (
        <>
          <path
            d="M4 18 L12 5 L20 18"
            {...p}
          />
          <path
            d="M8 18 H16"
            {...p}
          />
        </>
      );

    case "sniper":
      return (
        <>
          <circle
            cx="12"
            cy="12"
            r="7"
            {...p}
          />
          <path
            d="M12 3V21"
            {...p}
          />
          <path
            d="M3 12H21"
            {...p}
          />
        </>
      );

    case "engineer":
      return (
        <>
          <path
            d="M6 6L10 10"
            {...p}
          />
          <path
            d="M14 14L18 18"
            {...p}
          />
          <circle
            cx="8"
            cy="8"
            r="2.5"
            {...p}
          />
          <circle
            cx="16"
            cy="16"
            r="2.5"
            {...p}
          />
        </>
      );

    case "infantry":
      return (
        <>
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            {...p}
          />
          <path
            d="M6 12H18"
            {...p}
          />
          <path
            d="M12 6V18"
            {...p}
          />
        </>
      );

    case "spy":
      return (
        <>
          <path
            d="M3 14Q12 6 21 14"
            {...p}
          />
          <circle
            cx="9"
            cy="14"
            r="2.2"
            {...p}
          />
          <circle
            cx="15"
            cy="14"
            r="2.2"
            {...p}
          />
        </>
      );

    case "bomb":
      return (
        <>
          <circle
            cx="12"
            cy="14"
            r="6"
            {...p}
          />
          <path
            d="M16 8L19 5"
            {...p}
          />
          <path
            d="M14 6L15 4"
            {...p}
          />
        </>
      );

    case "flag":
      return (
        <>
          <path
            d="M6 21V4"
            {...p}
          />
          <path
            d="M6 4L18 6L14 10L18 14L6 12"
            {...p}
          />
        </>
      );

    default:
      return (
        <circle
          cx="12"
          cy="12"
          r="5"
          {...p}
        />
      );
  }
}