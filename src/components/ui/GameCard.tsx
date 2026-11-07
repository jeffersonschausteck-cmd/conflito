import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GameCardState = "default" | "selected" | "disabled" | "hidden";

export interface GameCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual state of the card */
  state?: GameCardState;
  /** Allow hover lift animation */
  hoverable?: boolean;
  /** Optional header slot */
  header?: ReactNode;
  /** Optional footer slot */
  footer?: ReactNode;
  /** Card body content */
  children?: ReactNode;
  // Legacy compat prop — maps to state === "selected"
  active?: boolean;
}

// ─── State style maps (values derived from theme palette) ────────────────────

const STATE_CLASSES: Record<GameCardState, string> = {
  default:
    "border-cyan-400/35 bg-slate-950/75 backdrop-blur-sm",
  selected:
    "border-amber-300 bg-slate-900/80 shadow-[0_0_22px_rgba(251,191,36,0.3)]",
  disabled:
    "border-slate-600 bg-slate-900/50 opacity-50 pointer-events-none",
  hidden:
    "invisible opacity-0 pointer-events-none",
};

const HOVER_CLASSES: Record<GameCardState, string> = {
  default:
    "hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-slate-900/85 hover:shadow-[0_0_20px_rgba(34,211,238,0.28)]",
  selected: "",
  disabled: "",
  hidden: "",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function GameCard({
  state,
  hoverable = true,
  active,          // legacy compat
  header,
  footer,
  children,
  className,
  style,
  ...props
}: GameCardProps) {
  // Resolve effective state (legacy `active` prop maps to "selected")
  const effectiveState: GameCardState =
    state ?? (active ? "selected" : "default");

  const isSelected = effectiveState === "selected";

  return (
    <div
      className={cn(
        "relative border transition-all ease-out",
        `duration-[${theme.animations.duration.normal}]`,
        STATE_CLASSES[effectiveState],
        hoverable && HOVER_CLASSES[effectiveState],
        className
      )}
      style={{
        clipPath:
          "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
        ...style,
      }}
      {...props}
    >
      {/* Scanline shimmer when selected */}
      {isSelected && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-game-blue/0 via-game-blue/5 to-game-blue/0 pointer-events-none opacity-20 animate-pulse"
        />
      )}

      {/* Header slot */}
      {header && (
        <div className="relative z-10 border-b border-border/40 px-4 py-3">
          {header}
        </div>
      )}

      {/* Body slot */}
      {children && (
        <div className="relative z-10 px-4 py-3">
          {children}
        </div>
      )}

      {/* Footer slot */}
      {footer && (
        <div className="relative z-10 border-t border-border/40 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
