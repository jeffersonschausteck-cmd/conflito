import React, { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GameButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "disabled"
  | "loading";

export type GameButtonSize = "sm" | "md" | "lg";

export interface GameButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  children: ReactNode;
}

// ─── Lookup maps (all values derived from design system) ─────────────────────

const SIZE: Record<GameButtonSize, string> = {
  sm: "px-3 py-1.5 text-[10px] tracking-[0.15em]",
  md: "px-6 py-2.5 text-xs tracking-[0.2em]",
  lg: "px-8 py-3.5 text-sm tracking-[0.25em]",
};

// Inline style tokens pulled from theme for any value that can't be expressed
// as a Tailwind class (e.g. exact rgba from the design palette).
const GLOW_SHADOW: Partial<Record<GameButtonVariant, string>> = {
  primary: theme.shadows.blueGlow,
  danger:  theme.shadows.redGlow,
};

const GLOW_HOVER_SHADOW: Partial<Record<GameButtonVariant, string>> = {
  primary: theme.shadows.blueGlowStrong,
  danger:  theme.shadows.redGlowStrong,
};

const VARIANT_CLASSES: Record<GameButtonVariant, string> = {
  primary:
    "border-game-blue bg-game-blue/10 text-game-blue " +
    "hover:bg-game-blue/20 hover:scale-[1.02] " +
    "active:scale-[0.97]",
  secondary:
    "border-game-border bg-game-panel text-game-text " +
    "hover:border-game-blue/40 hover:text-game-blue " +
    "active:scale-[0.98]",
  danger:
    "border-game-red bg-game-red/10 text-game-red " +
    "hover:bg-game-red/20 hover:scale-[1.02] " +
    "active:scale-[0.97]",
  ghost:
    "border-transparent bg-transparent text-muted-foreground " +
    "hover:text-game-text hover:text-glow " +
    "active:scale-[0.98]",
  disabled:
    "border-game-border bg-game-panel/40 text-muted-foreground " +
    "opacity-55 cursor-not-allowed",
  loading:
    "border-game-blue/40 bg-game-blue/5 text-game-blue/60 cursor-wait",
};

// ─── Component ───────────────────────────────────────────────────────────────

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  (
    { variant = "primary", size = "md", children, className, disabled, style, ...props },
    ref
  ) => {
    const isReallyDisabled =
      disabled || variant === "disabled" || variant === "loading";

    return (
      <button
        ref={ref}
        disabled={isReallyDisabled}
        className={cn(
          // Base
          "relative select-none border font-display uppercase font-bold outline-none",
          // Transitions — use theme duration/easing tokens via CSS vars
          "transition-all duration-[250ms] ease-out",
          // Focus ring
          "focus-visible:ring-2 focus-visible:ring-game-blue/70",
          SIZE[size],
          VARIANT_CLASSES[variant],
          className
        )}
        style={{
          clipPath:
            "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
          boxShadow: isReallyDisabled
            ? undefined
            : GLOW_SHADOW[variant],
          // Merge caller's style overrides
          ...style,
        }}
        {...props}
        // Override hover glow via CSS custom property on the element
        onMouseEnter={(e) => {
          if (!isReallyDisabled && GLOW_HOVER_SHADOW[variant]) {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              GLOW_HOVER_SHADOW[variant]!;
          }
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (!isReallyDisabled) {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              GLOW_SHADOW[variant] ?? "";
          }
          props.onMouseLeave?.(e);
        }}
      >
        <span className="flex items-center justify-center gap-2">
          {variant === "loading" && (
            <svg
              className="animate-spin h-3 w-3 shrink-0 text-current"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {children}
        </span>
      </button>
    );
  }
);

GameButton.displayName = "GameButton";
