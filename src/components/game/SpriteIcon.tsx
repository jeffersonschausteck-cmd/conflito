import { cn } from "@/lib/utils";

type Props = {
    type: string;
    size?: number;
    faction?: "blue" | "red";
    className?: string;
};

export function SpriteIcon({
    type,
    size = 64,
    faction = "blue",
    className,
}: Props) {
    return (
        <img
            src={`/pieces/${type}.png`}
            alt={type}
            className={cn(className)}
            style={{
                width: size,
                height: size,
                objectFit: "contain",
                display: "block",
                filter:
                    faction === "blue"
                        ? "drop-shadow(0 0 6px rgba(0,212,255,0.7))"
                        : "drop-shadow(0 0 6px rgba(255,80,100,0.7))",
            }}
            onError={(e) => {
                console.log("Sprite not found:", type);
            }}
        />
    );
}