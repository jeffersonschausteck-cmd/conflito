import { Board } from "@/components/Board";
import { Piece } from "@/components/Piece";
import { useMovement } from "@/hooks/useMovement";

export interface BoardWithPiecesProps {
  rows?: number;
  cols?: number;
}

/**
 * Composes the existing Board (tiles + selection) with a non-invasive
 * piece + movement overlay. Board and Piece components are NOT modified.
 *
 * Layering (top -> bottom):
 *   1. Tile click overlay  (captures movement clicks on legal tiles)
 *   2. Pieces layer        (absolutely positioned, animated transitions)
 *   3. Highlight layer     (cyan glow on legal destination tiles)
 *   4. Board               (existing visual + tile selection)
 *
 * All movement logic lives in MovementEngine — this file only renders.
 */
export function BoardWithPieces({ rows = 10, cols = 10 }: BoardWithPiecesProps) {
  const {
    pieces,
    selectedPieceId,
    legalMoves,
    onPieceClick,
    onTileClick,
  } = useMovement({ rows, cols });

  const cellW = 100 / cols;
  const cellH = 100 / rows;

  return (
    <div className="relative w-full max-w-[min(90vh,90vw)] mx-auto">
      <Board rows={rows} cols={cols} />

      {/* Inner overlay — matches Board's p-3 inner padding. */}
      <div className="pointer-events-none absolute inset-0 p-3">
        <div className="relative h-full w-full">
          {/* Highlight layer: legal destination tiles */}
          {legalMoves.size > 0 && (
            <div className="pointer-events-none absolute inset-0">
              {Array.from(legalMoves).map((key) => {
                const [r, c] = key.split("-").map(Number);
                return (
                  <div
                    key={`hl-${key}`}
                    className="legal-tile absolute"
                    style={{
                      top: `${r * cellH}%`,
                      left: `${c * cellW}%`,
                      width: `${cellW}%`,
                      height: `${cellH}%`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Pieces layer: absolutely positioned for smooth 250ms transitions */}
          <div className="absolute inset-0">
            {pieces
              .filter((p) => p.isAlive)
              .map((piece) => (
                <div
                  key={piece.id}
                  className="pointer-events-auto absolute flex items-center justify-center"
                  style={{
                    top: `${piece.currentRow * cellH}%`,
                    left: `${piece.currentColumn * cellW}%`,
                    width: `${cellW}%`,
                    height: `${cellH}%`,
                    transition:
                      "top 250ms ease-in-out, left 250ms ease-in-out",
                    willChange: "top, left",
                  }}
                >
                  <Piece
                    piece={piece}
                    selected={piece.id === selectedPieceId}
                    onClick={onPieceClick}
                  />
                </div>
              ))}
          </div>

          {/* Click capture layer: only legal destination tiles are interactive */}
          {legalMoves.size > 0 && (
            <div className="absolute inset-0">
              {Array.from(legalMoves).map((key) => {
                const [r, c] = key.split("-").map(Number);
                return (
                  <button
                    key={`click-${key}`}
                    type="button"
                    aria-label={`Move to ${r},${c}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTileClick({ row: r, column: c });
                    }}
                    className="pointer-events-auto absolute cursor-pointer bg-transparent outline-none"
                    style={{
                      top: `${r * cellH}%`,
                      left: `${c * cellW}%`,
                      width: `${cellW}%`,
                      height: `${cellH}%`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
