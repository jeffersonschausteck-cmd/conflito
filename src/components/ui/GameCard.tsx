import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GameCardProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  hoverable?: boolean;
  children: ReactNode;
}

export function GameCard({
  active = false,
  hoverable = true,
  children,
  className,
  ...props
}: GameCardProps) {
  return (
    <div
      className={cn(
        "relative border bg-game-panel/50 p-4 transition-all duration-200 ease-out",
        active
          ? "border-game-blue bg-game-blue/5 shadow-[0_0_20px_rgba(0,212,255,0.15)]"
          : "border-game-border",
        hoverable && !active && "hover:-translate-y-0.5 hover:border-game-blue/40 hover:bg-game-blue/5 hover:shadow-[0_0_15px_rgba(0,212,255,0.1)]",
        className
      )}
      style={{
        clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
      }}
      {...props}
    >
      {/* Dynamic scanline overlay when active */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-b from-game-blue/0 via-game-blue/5 to-game-blue/0 pointer-events-none opacity-20 animate-pulse" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
