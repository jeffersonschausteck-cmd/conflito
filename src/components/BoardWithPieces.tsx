import { Board } from "@/components/Board";
import { Piece } from "@/components/Piece";
import { usePieces } from "@/hooks/usePieces";

export interface BoardWithPiecesProps {
  rows?: number;
  cols?: number;
}

/**
 * Composes the existing Board (tiles + selection) with a non-invasive
 * piece overlay. The Board component itself is NOT modified — pieces
 * live in a sibling grid that mirrors the tile layout and sits on top.
 */
export function BoardWithPieces({ rows = 10, cols = 10 }: BoardWithPiecesProps) {
  const { pieces, selectedPieceId, selectPiece } = usePieces({ rows, cols });

  return (
    <div className="relative w-full max-w-[min(90vh,90vw)] mx-auto">
      <Board rows={rows} cols={cols} />
      {/* Overlay grid — perfectly aligned to the Board's inner grid. */}
      <div
        aria-hidden={false}
        className="pointer-events-none absolute inset-0 p-3"
      >
        <div
          className="grid h-full w-full gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const piece = pieces.find(
              (p) => p.isAlive && p.currentRow === r && p.currentColumn === c,
            );
            return (
              <div
                key={`slot-${r}-${c}`}
                className="pointer-events-none flex aspect-square items-center justify-center"
              >
                {piece && (
                  <div className="pointer-events-auto flex h-full w-full items-center justify-center">
                    <Piece
                      piece={piece}
                      selected={piece.id === selectedPieceId}
                      onClick={(p) =>
                        selectPiece(p.id === selectedPieceId ? null : p.id)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
