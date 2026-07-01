import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export interface GameTooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * GameTooltip - Custom futuristic cyberpunk tooltip with soft glowing borders.
 */
export function GameTooltip({
  content,
  children,
  position = "top",
  className,
}: GameTooltipProps) {
  const [active, setActive] = useState(false);

  const showTooltip = () => setActive(true);
  const hideTooltip = () => setActive(false);

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-2.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-2.5",
  };

  const arrows = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-game-border border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-game-border border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-game-border border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-game-border border-y-transparent border-l-transparent",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {active && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 pointer-events-none whitespace-nowrap border border-game-border bg-game-panel/95 px-3 py-1.5 text-left text-xs text-game-text shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-display uppercase tracking-[0.1em]",
            positions[position],
            className
          )}
          style={{
            clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            animation: "tooltip-fade-in 150ms ease-out forwards",
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes tooltip-fade-in {
              0% { opacity: 0; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(0.95); }
              100% { opacity: 1; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(1); }
            }
          `}} />
          {/* Arrow */}
          <div className={cn("absolute border-4 pointer-events-none", arrows[position])} />
          {content}
        </div>
      )}
    </div>
  );
}
