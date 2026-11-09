import React, { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { SoundHooks } from "@/services/soundHooks";

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
  primary: "0 0 22px rgba(251, 191, 36, 0.38)",
  danger:  "0 0 18px rgba(244, 63, 94, 0.32)",
  secondary: "0 0 14px rgba(34, 211, 238, 0.16)",
};

const GLOW_HOVER_SHADOW: Partial<Record<GameButtonVariant, string>> = {
  primary: "0 0 32px rgba(251, 191, 36, 0.6)",
  danger:  "0 0 28px rgba(244, 63, 94, 0.5)",
  secondary: "0 0 22px rgba(34, 211, 238, 0.35)",
};

const VARIANT_CLASSES: Record<GameButtonVariant, string> = {
  primary:
    "border-amber-300 bg-gradient-to-b from-amber-500 to-amber-700 text-white " +
    "hover:brightness-110 active:scale-[0.97]",
  secondary:
    "border-cyan-400/55 bg-gradient-to-b from-sky-900/85 to-slate-950/90 text-sky-50 " +
    "hover:border-cyan-300 active:scale-[0.98]",
  danger:
    "border-rose-400 bg-gradient-to-b from-rose-600 to-rose-900 text-white " +
    "hover:brightness-110 active:scale-[0.97]",
  ghost:
    "border-transparent bg-transparent text-sky-100 [text-shadow:0_1px_2px_#000] " +
    "hover:text-white active:scale-[0.98]",
  disabled:
    "border-slate-600 bg-slate-800/70 text-slate-400 " +
    "opacity-60 cursor-not-allowed",
  loading:
    "border-cyan-400/40 bg-sky-900/40 text-cyan-200/70 cursor-wait",
};

// ─── Component ───────────────────────────────────────────────────────────────

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  (
    { variant = "primary", size = "md", children, className, disabled, style, onClick, ...props },
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
        // Sprint AUDIO-01 — GameButton é o componente compartilhado por
        // TODO botão de ação primária do jogo; centralizar o som de
        // clique aqui evita espalhar `SoundHooks.playButtonClick()` em
        // cada call site.
        onClick={(e) => {
          if (!isReallyDisabled) SoundHooks.playButtonClick();
          onClick?.(e);
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
