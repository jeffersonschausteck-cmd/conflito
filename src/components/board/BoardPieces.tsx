export interface BoardPiecesProps {
    rows?: number;
    cols?: number;
}

export function BoardPieces({
    rows = 10,
    cols = 10,
}: BoardPiecesProps) {
    return (
        <div
            className="h-full w-full pointer-events-none"
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
        >
            {/* As peças serão migradas para cá na próxima fase. */}
        </div>
    );
}