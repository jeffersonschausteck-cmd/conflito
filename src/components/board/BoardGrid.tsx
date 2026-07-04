export interface BoardGridProps {
    rows?: number;
    cols?: number;
}

export function BoardGrid({
    rows = 10,
    cols = 10,
}: BoardGridProps) {
    const horizontal = [];
    const vertical = [];

    for (let row = 0; row <= rows; row++) {
        horizontal.push(
            <line
                key={`h-${row}`}
                x1="0"
                y1={`${(row * 100) / rows}%`}
                x2="100%"
                y2={`${(row * 100) / rows}%`}
            />
        );
    }

    for (let col = 0; col <= cols; col++) {
        vertical.push(
            <line
                key={`v-${col}`}
                x1={`${(col * 100) / cols}%`}
                y1="0"
                x2={`${(col * 100) / cols}%`}
                y2="100%"
            />
        );
    }

    return (
        <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            <g
                stroke="#00FFFF"
                strokeWidth="0.45"
                opacity="1"
            >
                {horizontal}
                {vertical}
            </g>
        </svg>
    );
}