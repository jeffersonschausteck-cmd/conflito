import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PieceFrameProps {
    children: ReactNode;
    selected?: boolean;
    isBlue?: boolean;
}

export function PieceFrame({
    children,
    selected = false,
    isBlue = true,
}: PieceFrameProps) {
    return (
        <div
            className={cn(
                "relative flex h-[78%] w-[78%] items-center justify-center",
                "rounded-xl border transition-all duration-200",
                "bg-slate-900/80 backdrop-blur-sm",

                isBlue
                    ? "border-cyan-400/70"
                    : "border-red-400/70",

                selected && (
                    isBlue
                        ? "border-cyan-200 shadow-[0_0_18px_rgba(34,211,238,.45)]"
                        : "border-red-200 shadow-[0_0_18px_rgba(248,113,113,.45)]"
                )
            )}
        >
            {children}
        </div>
    );
}