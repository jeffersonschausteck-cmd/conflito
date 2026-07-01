import React, { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GameTooltipPosition = "top" | "bottom" | "left" | "right";

export interface GameTooltipProps {
  /** Content rendered inside the floating tooltip */
  content: ReactNode;
  /** The trigger element */
  children: ReactNode;
  /** Where the tooltip appears relative to the trigger */
  position?: GameTooltipPosition;
  className?: string;
}

// ─── Position helpers ─────────────────────────────────────────────────────────

const POSITION_CLASSES: Record<GameTooltipPosition, string> = {
  top:    "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2.5",
  left:   "right-full top-1/2 -translate-y-1/2 mr-2.5",
  right:  "left-full top-1/2 -translate-y-1/2 ml-2.5",
};

const ARROW_CLASSES: Record<GameTooltipPosition, string> = {
  top:    "top-full left-1/2 -translate-x-1/2 border-t-game-border border-x-transparent border-b-transparent",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-game-border border-x-transparent border-t-transparent",
  left:   "left-full top-1/2 -translate-y-1/2 border-l-game-border border-y-transparent border-r-transparent",
  right:  "right-full top-1/2 -translate-y-1/2 border-r-game-border border-y-transparent border-l-transparent",
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * GameTooltip — hover-triggered futuristic floating panel.
 *
 * Uses theme.colors.textMuted and design system animation/shadow tokens.
 * For the shadcn Radix tooltip (used internally by sidebar, etc.), see tooltip.tsx.
 */
export function GameTooltip({
  content,
  children,
  position = "top",
  className,
}: GameTooltipProps) {
  const [active, setActive] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      {children}

      {active && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 pointer-events-none whitespace-nowrap border",
            "border-game-border bg-game-panel/95",
            "px-3 py-1.5",
            "font-display text-xs uppercase tracking-[0.1em]",
            "shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
            POSITION_CLASSES[position],
            className
          )}
          style={{
            color: theme.colors.textMuted,
            clipPath:
              "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            animation: `tooltip-fade-in ${theme.animations.duration.fast} ${theme.animations.easing.easeOut} forwards`,
          }}
        >
          {/* Inline keyframe — scoped, no global CSS pollution */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes tooltip-fade-in {
                  0%   { opacity: 0; transform: translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) scale(0.95); }
                  100% { opacity: 1; transform: translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) scale(1); }
                }
              `,
            }}
          />
          {/* Directional arrow */}
          <div
            aria-hidden="true"
            className={cn("absolute border-4 pointer-events-none", ARROW_CLASSES[position])}
          />
          {content}
        </div>
      )}
    </div>
  );
}
