export interface BoardFogProps {
    rows?: number;
    cols?: number;
}

export function BoardFog({
    rows = 10,
    cols = 10,
}: BoardFogProps) {
    return (
        <div
            className="h-full w-full pointer-events-none"
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
        >
            {/* Camada reservada para o Fog of War */}
        </div>
    );
}