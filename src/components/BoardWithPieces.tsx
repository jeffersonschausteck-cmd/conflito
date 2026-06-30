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
 * Composes the existing Board (tiles + selection) with a non-invasive
 * piece overlay driven by the global GameState. Board and Piece
 * components remain presentation-only.
 *
 * v0.2: selection only. Clicking a piece selects it; clicking the same
 * piece deselects. Empty tiles do nothing. No movement.
 */
export function BoardWithPieces({ rows = 10, cols = 10 }: BoardWithPiecesProps) {
  const { state, selectedPiece, selectPiece } = useGameState();
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
          {/* Pieces layer: absolutely positioned for smooth transitions. */}
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
        </div>
      </div>
    </div>
  );
}

// Re-export for tests / consumers that want the pure helper.
export { GameEngine };
