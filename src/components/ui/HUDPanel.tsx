import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface HUDPanelProps {
  label: string;
  value: string | number;
  subLabel?: string;
  accentColor?: "blue" | "red" | "green" | "yellow";
  className?: string;
}

export function HUDPanel({
  label,
  value,
  subLabel,
  accentColor = "blue",
  className,
}: HUDPanelProps) {
  const accentColors = {
    blue: "text-game-blue border-game-blue/20",
    red: "text-game-red border-game-red/20",
    green: "text-game-green border-game-green/20",
    yellow: "text-game-yellow border-game-yellow/20",
  };

  const glows = {
    blue: "shadow-[inset_0_0_10px_rgba(0,212,255,0.05)]",
    red: "shadow-[inset_0_0_10px_rgba(255,75,92,0.05)]",
    green: "shadow-[inset_0_0_10px_rgba(44,234,163,0.05)]",
    yellow: "shadow-[inset_0_0_10px_rgba(255,200,87,0.05)]",
  };

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between border bg-game-panel/85 p-3.5 backdrop-blur-sm min-w-[100px]",
        accentColors[accentColor],
        glows[accentColor],
        className
      )}
      style={{
        clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
      }}
    >
      {/* Visual top bar highlight */}
      <div className={cn(
        "absolute top-0 inset-x-2 h-[2px]",
        accentColor === "blue" && "bg-game-blue/50",
        accentColor === "red" && "bg-game-red/50",
        accentColor === "green" && "bg-game-green/50",
        accentColor === "yellow" && "bg-game-yellow/50"
      )} />

      {/* Label */}
      <div className="font-display text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>

      {/* Main Value */}
      <div className={cn(
        "font-display text-lg font-bold tracking-[0.1em] mt-1.5 leading-none",
        accentColor === "blue" && "text-game-blue text-glow",
        accentColor === "red" && "text-game-red text-glow",
        accentColor === "green" && "text-game-green",
        accentColor === "yellow" && "text-game-yellow"
      )}>
        {value}
      </div>

      {/* Optional subLabel */}
      {subLabel && (
        <div className="font-display text-[8px] uppercase tracking-[0.15em] text-muted-foreground/60 mt-1">
          {subLabel}
        </div>
      )}
    </div>
  );
}
