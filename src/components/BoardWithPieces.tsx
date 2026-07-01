import { useEffect, useState } from "react";
import { Board } from "@/components/Board";
import { Piece } from "@/components/Piece";
import { useGameState } from "@/hooks/useGameState";
import { useRevealLog } from "@/hooks/useRevealLog";
import { FogOfWarEngine, LOCAL_VIEWER } from "@/services/fogOfWarEngine";
import { GameEngine } from "@/services/gameEngine";
import type { Piece as PieceModel } from "@/types/piece";

export interface BoardWithPiecesProps {
  rows?: number;
  cols?: number;
}

/**
 * Composes the Board with a non-invasive piece + movement overlay
 * driven entirely by the global GameState. Board and Piece remain
 * presentation-only; movement rules live in MovementEngine, combat
 * in CombatEngine — this component only *displays* their results.
 *
 * Layering (top -> bottom):
 *   1. Tile click overlay  (captures clicks on legal destination tiles)
 *   2. Pieces layer        (absolutely positioned, 250ms slide transitions)
 *   3. Combat feedback     (flash on the combat tile)
 *   4. Highlight layer     (cyan glow on legal tiles)
 *   5. Board               (existing visual + tile grid)
 */
export function BoardWithPieces({ rows = 10, cols = 10 }: BoardWithPiecesProps) {
  const {
    state,
    selectedPiece,
    legalMoves,
    lastCombat,
    selectPiece,
    moveSelectedTo,
    clearLastCombat,
  } = useGameState();
  const pieces = state.pieces;
  const selectedPieceId = selectedPiece?.id ?? null;
  const { justRevealed } = useRevealLog();

  const cellW = 100 / cols;
  const cellH = 100 / rows;

  // Auto-clear combat feedback after the flash animation completes so
  // the tile does not stay stuck in the animated state.
  const [combatTick, setCombatTick] = useState<number | null>(null);
  useEffect(() => {
    if (!lastCombat) return;
    setCombatTick(lastCombat.id);
    const t = window.setTimeout(() => {
      clearLastCombat();
      setCombatTick(null);
    }, 900);
    return () => window.clearTimeout(t);
  }, [lastCombat, clearLastCombat]);

  const handlePieceClick = (piece: PieceModel) => {
    // If a piece is selected and the clicked piece sits on a legal
    // (enemy) destination, treat the click as an attack rather than a
    // reselection — otherwise the enemy-occupied tile is unreachable.
    if (
      selectedPieceId &&
      piece.id !== selectedPieceId &&
      legalMoves.has(`${piece.currentRow}-${piece.currentColumn}`)
    ) {
      moveSelectedTo(piece.currentRow, piece.currentColumn);
      return;
    }
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

          {/* Combat flash — brief neon-magenta pulse on the combat tile. */}
          {lastCombat && combatTick === lastCombat.id && (
            <div
              key={`combat-${lastCombat.id}`}
              className="combat-flash pointer-events-none absolute"
              style={{
                top: `${lastCombat.tile.row * cellH}%`,
                left: `${lastCombat.tile.column * cellW}%`,
                width: `${cellW}%`,
                height: `${cellH}%`,
              }}
            />
          )}

          {/* Pieces layer — smooth 250ms ease-in-out slide. */}
          <div className="absolute inset-0">
            {pieces
              .filter((p) => p.isAlive)
              .map((piece) => {
                const isCombatTile =
                  lastCombat &&
                  combatTick === lastCombat.id &&
                  piece.currentRow === lastCombat.tile.row &&
                  piece.currentColumn === lastCombat.tile.column;
                const isWinner =
                  lastCombat &&
                  combatTick === lastCombat.id &&
                  lastCombat.survivorId === piece.id;
                const isRevealPulse = justRevealed.has(piece.id);
                const fxClass = [
                  isCombatTile ? "combat-shake" : "",
                  isWinner ? "combat-winner-glow" : "",
                  isRevealPulse ? "piece-reveal-pulse" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const hidden = FogOfWarEngine.isHiddenFrom(piece, LOCAL_VIEWER);
                return (
                  <div
                    key={piece.id}
                    className={`pointer-events-auto absolute flex items-center justify-center ${fxClass}`}
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
                      hidden={hidden}
                      onClick={handlePieceClick}
                    />
                  </div>
                );
              })}
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
