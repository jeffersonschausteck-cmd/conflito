import { map01, TerrainType } from "./maps/map01";

export interface BoardTerrainProps {
    rows?: number;
    cols?: number;
}

function terrainColor(type: TerrainType): string {
    switch (type) {
        case "grass":
            return "#3F6F42";

        case "forest":
            return "#27452B";

        case "water":
            return "#2A6FAF";

        case "mountain":
            return "#666666";

        case "road":
            return "#8B7A5A";

        case "blue-base":
            return "#2F74FF";

        case "red-base":
            return "#D93A3A";

        default:
            return "#000000";
    }
}

export function BoardTerrain({
    rows = 10,
    cols = 10,
}: BoardTerrainProps) {

    return (

        <div
            className="
grid
h-full
w-full
pointer-events-none
"
            style={{
                gridTemplateColumns: `repeat(${cols},1fr)`,
                gridTemplateRows: `repeat(${rows},1fr)`,
            }}
        >

            {map01.flatMap((row, rowIndex) =>
                row.map((terrain, columnIndex) => (

                    <div
                        key={`${rowIndex}-${columnIndex}`}
                        style={{
                            backgroundColor: terrainColor(terrain),
                        }}
                    />

                ))
            )}

        </div>

    );

}