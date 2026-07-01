import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GlowBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "blue" | "red" | "green" | "yellow";
  pulse?: boolean;
  children: ReactNode;
}

export function GlowBorder({
  color = "blue",
  pulse = true,
  children,
  className,
  ...props
}: GlowBorderProps) {
  const borderColors = {
    blue: "border-game-blue",
    red: "border-game-red",
    green: "border-game-green",
    yellow: "border-game-yellow",
  };

  const glows = {
    blue: "shadow-[0_0_15px_rgba(0,212,255,0.35)]",
    red: "shadow-[0_0_15px_rgba(255,75,92,0.35)]",
    green: "shadow-[0_0_15px_rgba(44,234,163,0.35)]",
    yellow: "shadow-[0_0_15px_rgba(255,200,87,0.35)]",
  };

  const pulseClasses = {
    blue: "animate-[pulse-blue_2.5s_ease-in-out_infinite]",
    red: "animate-[pulse-red_2.5s_ease-in-out_infinite]",
    green: "animate-[pulse-green_2.5s_ease-in-out_infinite]",
    yellow: "animate-[pulse-yellow_2.5s_ease-in-out_infinite]",
  };

  return (
    <div
      className={cn(
        "relative rounded border p-[1px] transition-all",
        borderColors[color],
        glows[color],
        pulse && pulseClasses[color],
        className
      )}
      {...props}
    >
      {/* Inline animations for keyframes to ensure standalone reusability */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-blue {
          0%, 100% { border-color: rgba(0, 212, 255, 0.7); box-shadow: 0 0 10px rgba(0, 212, 255, 0.25); }
          50% { border-color: rgba(0, 212, 255, 1); box-shadow: 0 0 20px rgba(0, 212, 255, 0.55); }
        }
        @keyframes pulse-red {
          0%, 100% { border-color: rgba(255, 75, 92, 0.7); box-shadow: 0 0 10px rgba(255, 75, 92, 0.25); }
          50% { border-color: rgba(255, 75, 92, 1); box-shadow: 0 0 20px rgba(255, 75, 92, 0.55); }
        }
        @keyframes pulse-green {
          0%, 100% { border-color: rgba(44, 234, 163, 0.7); box-shadow: 0 0 10px rgba(44, 234, 163, 0.25); }
          50% { border-color: rgba(44, 234, 163, 1); box-shadow: 0 0 20px rgba(44, 234, 163, 0.55); }
        }
        @keyframes pulse-yellow {
          0%, 100% { border-color: rgba(255, 200, 87, 0.7); box-shadow: 0 0 10px rgba(255, 200, 87, 0.25); }
          50% { border-color: rgba(255, 200, 87, 1); box-shadow: 0 0 20px rgba(255, 200, 87, 0.55); }
        }
      `}} />
      <div className="h-full w-full bg-game-panel rounded-[inherit]">
        {children}
      </div>
    </div>
  );
}
