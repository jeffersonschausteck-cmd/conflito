import type { PieceType } from "@/types/piece";

interface PieceGlyphProps {
    type: PieceType;
    stroke: string;
}

export function PieceGlyph({ type, stroke }: PieceGlyphProps) {
    const common = {
        fill: "none",
        stroke,
        strokeWidth: 1.6,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    };

    return (
        <svg
            viewBox="0 0 24 24"
            className="h-[70%] w-[70%]"
            aria-hidden
        >
            {glyphFor(type, common)}
        </svg>
    );
}

function glyphFor(type: PieceType, p: Record<string, unknown>) {
    switch (type) {
        case "commander":
            return (
                <polygon points="12,3 14,9 20,9 15,13 17,20 12,16 7,20 9,13 4,9 10,9" {...p} />
            );

        case "officer":
            return (
                <>
                    <polygon points="12,4 20,10 17,20 7,20 4,10" {...p} />
                    <circle cx="12" cy="13" r="2" {...p} />
                </>
            );

        case "scout":
            return (
                <>
                    <path d="M4 18 L12 5 L20 18" {...p} />
                    <path d="M8 18 L16 18" {...p} />
                </>
            );

        case "sniper":
            return (
                <>
                    <circle cx="12" cy="12" r="7" {...p} />
                    <path d="M12 3 V21 M3 12 H21" {...p} />
                </>
            );

        case "engineer":
            return (
                <>
                    <path d="M6 6 L10 10 M14 14 L18 18" {...p} />
                    <circle cx="8" cy="8" r="2.5" {...p} />
                    <circle cx="16" cy="16" r="2.5" {...p} />
                </>
            );

        case "infantry":
            return (
                <>
                    <rect x="6" y="6" width="12" height="12" {...p} />
                    <path d="M6 12 H18 M12 6 V18" {...p} />
                </>
            );

        case "spy":
            return (
                <>
                    <path d="M3 14 Q12 6 21 14" {...p} />
                    <circle cx="9" cy="14" r="2.2" {...p} />
                    <circle cx="15" cy="14" r="2.2" {...p} />
                </>
            );

        case "bomb":
            return (
                <>
                    <circle cx="12" cy="14" r="6" {...p} />
                    <path d="M16 8 L19 5 M14 6 L15 4" {...p} />
                </>
            );

        case "flag":
            return (
                <>
                    <path d="M6 21 V4" {...p} />
                    <path d="M6 4 L18 6 L14 10 L18 14 L6 12" {...p} />
                </>
            );

        default:
            return <circle cx="12" cy="12" r="5" {...p} />;
    }
}