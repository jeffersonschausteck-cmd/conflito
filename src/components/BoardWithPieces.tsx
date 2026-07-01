import { Board } from "@/components/Board";
import { Piece } from "@/components/Piece";
import { useGameState } from "@/hooks/useGameState";
import { GameEngine } from "@/services/gameEngine";
import type { Piece as PieceModel } from "@/types/piece";

export interface BoardWithPiecesProps {
  rows?: number;
  cols?: number;
}

/**
 * Composes the Board with a non-invasive piece + movement overlay
 * driven entirely by the global GameState. Board and Piece remain
 * presentation-only; movement rules live in MovementEngine and are
 * accessed through the GameState API — this component never
 * calculates legality itself.
 *
 * Layering (top -> bottom):
 *   1. Tile click overlay  (captures clicks on legal destination tiles)
 *   2. Pieces layer        (absolutely positioned, 250ms slide transitions)
 *   3. Highlight layer     (cyan glow on legal tiles)
 *   4. Board               (existing visual + tile grid)
 */
export function BoardWithPieces({ rows = 10, cols = 10 }: BoardWithPiecesProps) {
  const { state, selectedPiece, legalMoves, selectPiece, moveSelectedTo } =
    useGameState();
  const pieces = state.pieces;
  const selectedPieceId = selectedPiece?.id ?? null;

  const cellW = 100 / cols;
  const cellH = 100 / rows;

  const handlePieceClick = (piece: PieceModel) => {
    selectPiece(piece.id === selectedPieceId ? null : piece.id);
  };

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

          {/* Pieces layer — smooth 250ms ease-in-out slide. */}
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
                    onClick={handlePieceClick}
                  />
                </div>
              ))}
          </div>

          {/* Click capture: only legal destination tiles are interactive. */}
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
                      moveSelectedTo(r, c);
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

export { GameEngine };
