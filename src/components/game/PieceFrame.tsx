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
                "relative flex h-[84%] w-[84%] items-center justify-center",

                // Forma
                "[clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]",

                // Fundo
                "bg-gradient-to-b",
                "from-slate-700",
                "via-slate-900",
                "to-black",

                // Borda
                "border-2",

                isBlue
                    ? "border-cyan-400"
                    : "border-red-400",

                // Sombra
                "shadow-lg",

                // Hover
                "transition-all duration-200",

                "hover:scale-105",

                selected &&
                (isBlue
                    ? "shadow-cyan-400/60 scale-110"
                    : "shadow-red-400/60 scale-110")
            )}
        >
            {/* brilho interno */}
            <div
                className="absolute inset-[2px] opacity-20
        [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]
        bg-gradient-to-b
        from-white
        to-transparent"
            />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}