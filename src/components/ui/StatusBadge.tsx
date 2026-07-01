import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StatusBadgeColor = "blue" | "red" | "green" | "yellow" | "gray";

export interface StatusBadgeProps {
  /** The color variant — maps directly to the theme palette */
  color?: StatusBadgeColor;
  /** Text label */
  label: string;
  /** Optional leading icon */
  icon?: ReactNode;
  className?: string;
}

// ─── Color maps (all values from theme.colors) ────────────────────────────────

const COLOR_CLASSES: Record<StatusBadgeColor, string> = {
  blue:   "border-game-blue/35   bg-game-blue/10   text-game-blue",
  red:    "border-game-red/35    bg-game-red/10    text-game-red",
  green:  "border-game-green/35  bg-game-green/10  text-game-green",
  yellow: "border-game-yellow/35 bg-game-yellow/10 text-game-yellow",
  gray:   "border-game-border    bg-game-panel/80  text-muted-foreground",
};

// Neon glow drop-shadows keyed to each color — pulled from theme.shadows
const GLOW_SHADOW: Record<StatusBadgeColor, string> = {
  blue:   theme.shadows.textGlowBlue,
  red:    theme.shadows.textGlowRed,
  green:  "0 0 6px rgba(44, 234, 163, 0.35)",
  yellow: "0 0 6px rgba(255, 200, 87, 0.35)",
  gray:   "none",
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatusBadge — compact labeled indicator for turn state, unit status, alerts.
 *
 * Variants: blue | red | green | yellow | gray
 */
export function StatusBadge({
  color = "blue",
  label,
  icon,
  className,
}: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 rounded-sm",
        "font-display text-[9px] uppercase tracking-[0.2em] font-bold select-none",
        COLOR_CLASSES[color],
        className
      )}
      style={{
        filter: `drop-shadow(${GLOW_SHADOW[color]})`,
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </div>
  );
}
