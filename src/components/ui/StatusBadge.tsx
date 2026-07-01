import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  color?: "blue" | "red" | "green" | "yellow" | "gray";
  label: string;
  icon?: ReactNode;
  className?: string;
}

export function StatusBadge({
  color = "blue",
  label,
  icon,
  className,
}: StatusBadgeProps) {
  const badgeColors = {
    blue: "border-game-blue/35 bg-game-blue/10 text-game-blue drop-shadow-[0_0_4px_rgba(0,212,255,0.2)]",
    red: "border-game-red/35 bg-game-red/10 text-game-red drop-shadow-[0_0_4px_rgba(255,75,92,0.2)]",
    green: "border-game-green/35 bg-game-green/10 text-game-green drop-shadow-[0_0_4px_rgba(44,234,163,0.2)]",
    yellow: "border-game-yellow/35 bg-game-yellow/10 text-game-yellow drop-shadow-[0_0_4px_rgba(255,200,87,0.2)]",
    gray: "border-game-border bg-game-panel/80 text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 rounded-sm font-display text-[9px] uppercase tracking-[0.2em] font-bold select-none",
        badgeColors[color],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </div>
  );
}
