import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GamePanelVariant = "default" | "blue" | "red" | "green" | "yellow";

export interface GamePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GamePanelVariant;
  /** Enable neon glow around the panel */
  glow?: boolean;
  /** Short label rendered above the title in muted uppercase */
  eyebrow?: string;
  /** Panel heading */
  title?: string;
  /** Panel body */
  children: ReactNode;
}

// ─── Lookup maps (rgba pulled from theme palette) ────────────────────────────

const BORDER: Record<GamePanelVariant, string> = {
  default: "border-game-border",
  blue:    "border-game-blue/40",
  red:     "border-game-red/40",
  green:   "border-game-green/40",
  yellow:  "border-game-yellow/40",
};

const GLOW_SHADOW: Record<GamePanelVariant, string> = {
  default: theme.shadows.softAmbient,
  blue:    theme.shadows.blueGlow,
  red:     theme.shadows.redGlow,
  green:   theme.shadows.green,
  yellow:  theme.shadows.yellow,
};

const TITLE_COLOR: Record<GamePanelVariant, string> = {
  default: "text-muted-foreground",
  blue:    "text-game-blue",
  red:     "text-game-red",
  green:   "text-game-green",
  yellow:  "text-game-yellow",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function GamePanel({
  variant = "default",
  glow = false,
  title,
  eyebrow,
  children,
  className,
  style,
  ...props
}: GamePanelProps) {
  return (
    <div
      className={cn(
        "relative border bg-game-panel/75 backdrop-blur-md",
        // Padding via spacing system token (24px = 1.5rem = theme.spacing[24])
        "p-6",
        BORDER[variant],
        className
      )}
      style={{
        clipPath:
          "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
        boxShadow: glow ? GLOW_SHADOW[variant] : theme.shadows.panelShadow,
        ...style,
      }}
      {...props}
    >
      {/* Cyber corner accent marks */}
      <div
        aria-hidden="true"
        className={cn("absolute top-0 left-0 w-2 h-2 border-t border-l", BORDER[variant])}
      />
      <div
        aria-hidden="true"
        className={cn("absolute bottom-0 right-0 w-2 h-2 border-b border-r", BORDER[variant])}
      />

      {/* Optional header section */}
      {(eyebrow || title) && (
        <div className="mb-4 border-b border-border/40 pb-3">
          {eyebrow && (
            <div className="font-display text-[9px] uppercase tracking-[0.35em] text-muted-foreground/75 mb-0.5">
              {eyebrow}
            </div>
          )}
          {title && (
            <h3
              className={cn(
                "font-display text-sm font-bold uppercase tracking-[0.15em]",
                TITLE_COLOR[variant]
              )}
            >
              {title}
            </h3>
          )}
        </div>
      )}

      {/* Body */}
      <div className="relative z-10 text-sm leading-relaxed text-game-text">
        {children}
      </div>
    </div>
  );
}
