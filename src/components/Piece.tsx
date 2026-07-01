import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Piece as PieceModel, PieceType } from "@/types/piece";

export interface PieceProps {
  piece: PieceModel;
  selected?: boolean;
  /** Fog-of-war: when true, render a generic "unknown unit" glyph. */
  hidden?: boolean;
  onClick?: (piece: PieceModel) => void;
}

/**
 * Pure presentational piece. Uses minimalist inline SVG glyphs — no
 * raster assets. The glyph is chosen by pieceType; color by owner.
 * When `hidden` is true the true glyph is replaced by a generic
 * silhouette (fog of war) — color + position remain visible.
 */
function PieceBase({ piece, selected = false, hidden = false, onClick }: PieceProps) {
  if (!piece.isAlive) return null;

  const isBlue = piece.owner === "blue";
  const stroke = isBlue ? "rgb(103, 232, 249)" : "rgb(251, 113, 133)";
  const glow = isBlue
    ? "shadow-[0_0_18px_-2px_rgba(34,211,238,0.85)]"
    : "shadow-[0_0_18px_-2px_rgba(244,63,94,0.85)]";

  const label = hidden
    ? `${piece.owner} unknown unit`
    : `${piece.owner} ${piece.pieceType}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(piece);
      }}
      className={cn(
        "group relative flex h-[78%] w-[78%] items-center justify-center rounded-full",
        "border backdrop-blur-sm transition-all duration-150 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80",
        isBlue
          ? "border-cyan-400/60 bg-slate-950/70"
          : "border-rose-400/60 bg-slate-950/70",
        "hover:scale-[1.06]",
        selected && `scale-[1.05] ${glow}`,
        selected &&
          (isBlue ? "border-cyan-200" : "border-rose-200") +
            " bg-cyan-400/10",
      )}
    >
      {selected && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-1 rounded-full border",
            isBlue ? "border-cyan-300/80" : "border-rose-300/80",
          )}
        />
      )}
      {hidden ? (
        <UnknownGlyph stroke={stroke} />
      ) : (
        <PieceGlyph type={piece.pieceType} stroke={stroke} />
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
    <svg viewBox="0 0 24 24" className="h-[70%] w-[70%]" aria-hidden>
      {/* Hex silhouette + centered question mark = "unknown unit". */}
      <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" {...p} />
      <path d="M9.5 10 A2.5 2.5 0 1 1 12 12.5 V14" {...p} />
      <circle cx="12" cy="16.5" r="0.6" fill={stroke} stroke="none" />
    </svg>
  );
}

export const Piece = memo(PieceBase);

/* --- Minimalist SVG glyphs ------------------------------------------------ */

interface GlyphProps {
  type: PieceType;
  stroke: string;
}

function PieceGlyph({ type, stroke }: GlyphProps) {
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[70%] w-[70%]"
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
          <polygon points="12,3 14,9 20,9 15,13 17,20 12,16 7,20 9,13 4,9 10,9" {...p} />
        </>
      );
    case "officer":
      return (
        <>
          <polygon points="12,4 20,10 17,20 7,20 4,10" {...p} />
          <circle cx="12" cy="13" r="2" {...p} />
        </>
      );
    case "scout":
      return (
        <>
          <path d="M4 18 L12 5 L20 18" {...p} />
          <path d="M8 18 L16 18" {...p} />
        </>
      );
    case "sniper":
      return (
        <>
          <circle cx="12" cy="12" r="7" {...p} />
          <path d="M12 3 V21 M3 12 H21" {...p} />
        </>
      );
    case "engineer":
      return (
        <>
          <path d="M6 6 L10 10 M14 14 L18 18" {...p} />
          <circle cx="8" cy="8" r="2.5" {...p} />
          <circle cx="16" cy="16" r="2.5" {...p} />
        </>
      );
    case "infantry":
      return (
        <>
          <rect x="6" y="6" width="12" height="12" {...p} />
          <path d="M6 12 H18 M12 6 V18" {...p} />
        </>
      );
    case "spy":
      return (
        <>
          <path d="M3 14 Q12 6 21 14" {...p} />
          <circle cx="9" cy="14" r="2.2" {...p} />
          <circle cx="15" cy="14" r="2.2" {...p} />
        </>
      );
    case "bomb":
      return (
        <>
          <circle cx="12" cy="14" r="6" {...p} />
          <path d="M16 8 L19 5 M14 6 L15 4" {...p} />
        </>
      );
    case "flag":
      return (
        <>
          <path d="M6 21 V4" {...p} />
          <path d="M6 4 L18 6 L14 10 L18 14 L6 12" {...p} />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="5" {...p} />;
  }
}
