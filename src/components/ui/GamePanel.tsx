import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GamePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "blue" | "red" | "green" | "yellow";
  glow?: boolean;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}

export function GamePanel({
  variant = "default",
  glow = false,
  title,
  eyebrow,
  children,
  className,
  ...props
}: GamePanelProps) {
  const borderColors = {
    default: "border-game-border",
    blue: "border-game-blue/40",
    red: "border-game-red/40",
    green: "border-game-green/40",
    yellow: "border-game-yellow/40",
  };

  const glows = {
    default: glow ? "shadow-[0_0_20px_rgba(31,41,55,0.2)]" : "",
    blue: glow ? "shadow-[0_0_25px_rgba(0,212,255,0.15)]" : "",
    red: glow ? "shadow-[0_0_25px_rgba(255,75,92,0.15)]" : "",
    green: glow ? "shadow-[0_0_25px_rgba(44,234,163,0.15)]" : "",
    yellow: glow ? "shadow-[0_0_25px_rgba(255,200,87,0.15)]" : "",
  };

  const headerColors = {
    default: "text-muted-foreground",
    blue: "text-game-blue",
    red: "text-game-red",
    green: "text-game-green",
    yellow: "text-game-yellow",
  };

  return (
    <div
      className={cn(
        "relative border bg-game-panel/75 p-5 backdrop-blur-md",
        borderColors[variant],
        glows[variant],
        className
      )}
      style={{
        clipPath: "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
      }}
      {...props}
    >
      {/* Visual cyber corner highlights */}
      <div className={cn("absolute top-0 left-0 w-2 h-2 border-t border-l", borderColors[variant])} />
      <div className={cn("absolute bottom-0 right-0 w-2 h-2 border-b border-r", borderColors[variant])} />

      {(eyebrow || title) && (
        <div className="mb-4 border-b border-border/40 pb-3">
          {eyebrow && (
            <div className="font-display text-[9px] uppercase tracking-[0.35em] text-muted-foreground/75 mb-0.5">
              {eyebrow}
            </div>
          )}
          {title && (
            <h3 className={cn("font-display text-sm font-bold uppercase tracking-[0.15em]", headerColors[variant])}>
              {title}
            </h3>
          )}
        </div>
      )}

      <div className="relative z-10 text-sm leading-relaxed text-game-text">
        {children}
      </div>
    </div>
  );
}
