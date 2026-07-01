import { cn } from "@/lib/utils";
import { Piece } from "@/components/Piece";
import type { Piece as PieceModel, PieceType, PlayerOwner } from "@/types/piece";

export interface PieceCardProps {
  type: PieceType;
  owner: PlayerOwner;
  rank: number;
  statusState?: "hidden" | "selected" | "revealed" | "destroyed" | "default";
  className?: string;
  onClick?: () => void;
}

const PIECE_NAMES: Record<PieceType, string> = {
  commander: "Commander",
  officer: "Officer",
  sniper: "Sniper",
  engineer: "Engineer",
  infantry: "Infantry",
  scout: "Scout",
  spy: "Spy",
  bomb: "Bomb",
  flag: "Flag",
};

const PIECE_DESCRIPTIONS: Record<PieceType, string> = {
  commander: "Supreme command asset. Ranks highest in combat.",
  officer: "Standard tactical leader. Formidable on the frontlines.",
  sniper: "Long-range specialist. Ranks high and targets high-value assets.",
  engineer: "Operational engineer. Defuses mines and clears structural pathing.",
  infantry: "Regular frontline core force. Versatile and dependable.",
  scout: "Light recon division. Can traverse high speeds and identify targets.",
  spy: "Infiltration operator. Weak in defense but can neutralize commanders.",
  bomb: "Static countermeasure explosive. Devastating to incoming threats.",
  flag: "Critical objective target. Must be secured at all costs.",
};

export function PieceCard({
  type,
  owner,
  rank,
  statusState = "default",
  className,
  onClick,
}: PieceCardProps) {
  const isBlue = owner === "blue";
  
  // Make a mock PieceModel for rendering the icon
  const pieceModel: PieceModel = {
    id: `card-piece-${type}`,
    owner,
    pieceType: type,
    rank,
    canMove: type !== "flag" && type !== "bomb",
    isAlive: statusState !== "destroyed",
    isRevealed: statusState === "revealed",
    currentRow: -1,
    currentColumn: -1,
  };

  const statusBorderColor = {
    default: isBlue ? "border-game-blue/40" : "border-game-red/40",
    hidden: "border-muted/50",
    selected: isBlue ? "border-game-blue shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "border-game-red shadow-[0_0_15px_rgba(255,75,92,0.25)]",
    revealed: "border-game-green/60",
    destroyed: "border-destructive/30 grayscale opacity-45",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 border bg-game-panel/60 p-4 transition-all duration-200 ease-out",
        statusState !== "destroyed" && "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        statusState === "selected" && "scale-[1.02] bg-game-blue/5",
        statusBorderColor[statusState],
        className
      )}
      style={{
        clipPath: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
      }}
    >
      {/* Top Banner indicating faction/owner */}
      <div className="flex justify-between items-center border-b border-border/40 pb-2">
        <span className={cn(
          "font-display text-[9px] uppercase tracking-[0.25em] font-bold",
          isBlue ? "text-game-blue" : "text-game-red"
        )}>
          {owner === "blue" ? "BLUE FORCE" : "RED FORCE"}
        </span>
        <span className="font-display text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {statusState.toUpperCase()}
        </span>
      </div>

      {/* Main card body with glyph and info */}
      <div className="flex gap-4 items-center">
        <div className={cn(
          "h-12 w-12 flex items-center justify-center rounded-full border bg-slate-950/60 shrink-0",
          isBlue ? "border-game-blue/20" : "border-game-red/20"
        )}>
          <Piece piece={pieceModel} hidden={statusState === "hidden"} />
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="font-display text-base font-bold uppercase tracking-[0.1em] text-foreground">
            {PIECE_NAMES[type]}
          </div>
          <div className="font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
            Rank {rank > 0 ? rank : "—"} <span className="mx-1.5 text-border">/</span> {type === "flag" || type === "bomb" ? "Static" : "Mobile"}
          </div>
        </div>
      </div>

      {/* Description text */}
      <p className="text-left text-xs text-muted-foreground leading-relaxed">
        {PIECE_DESCRIPTIONS[type]}
      </p>

      {/* Active Selection Glow */}
      {statusState === "selected" && (
        <div className={cn(
          "absolute bottom-0 inset-x-0 h-[2px]",
          isBlue ? "bg-game-blue" : "bg-game-red"
        )} />
      )}
    </div>
  );
}
