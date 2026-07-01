import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "disabled" | "loading";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function GameButton({
  variant = "primary",
  size = "md",
  children,
  className,
  disabled,
  ...props
}: GameButtonProps) {
  const isReallyDisabled = disabled || variant === "disabled" || variant === "loading";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-[10px] tracking-[0.15em]",
    md: "px-6 py-2.5 text-xs tracking-[0.2em]",
    lg: "px-8 py-3.5 text-sm tracking-[0.25em]",
  };

  const variantClasses = {
    primary: "border-game-blue bg-game-blue/10 text-game-blue hover:bg-game-blue/20 shadow-[0_0_15px_rgba(0,212,255,0.2)] hover:shadow-[0_0_25px_rgba(0,212,255,0.45)] hover:scale-[1.02]",
    secondary: "border-game-border bg-game-panel text-game-text hover:border-game-blue/40 hover:text-game-blue hover:shadow-[0_0_15px_rgba(0,212,255,0.15)]",
    danger: "border-game-red bg-game-red/10 text-game-red hover:bg-game-red/20 shadow-[0_0_15px_rgba(255,75,92,0.2)] hover:shadow-[0_0_25px_rgba(255,75,92,0.45)] hover:scale-[1.02]",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:text-game-text hover:text-glow",
    disabled: "border-game-border bg-game-panel/40 text-muted-foreground opacity-55 cursor-not-allowed",
    loading: "border-game-blue/40 bg-game-blue/5 text-game-blue/60 cursor-wait",
  };

  return (
    <button
      disabled={isReallyDisabled}
      className={cn(
        "relative select-none border font-display uppercase font-bold outline-none transition-all duration-200 ease-out",
        "focus-visible:ring-2 focus-visible:ring-game-blue/70",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      style={{
        clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
      }}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {variant === "loading" && (
          <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </span>
    </button>
  );
}
