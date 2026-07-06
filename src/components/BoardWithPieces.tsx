import { useEffect, useState } from "react";
import { HexBoard, HEX_SIZE } from "@/components/board/hex/HexBoard";
import { HexPieceLayer } from "@/components/board/hex/HexPieceLayer";
import { HexEffectsLayer } from "@/components/board/hex/HexEffectsLayer";
import { useGameState } from "@/hooks/useGameState";
import { useRevealLog } from "@/hooks/useRevealLog";
import { GameEngine } from "@/services/gameEngine";
import { ACTIVE_MAP } from "@/maps";
import type { MapDefinition } from "@/maps/types";
import type { Piece as PieceModel } from "@/types/piece";

export interface BoardWithPiecesProps {
  map?: MapDefinition;
  /** Notifies the parent screen of the last clicked cell (for the Terrain Panel). */
  onTileClick?: (row: number, col: number) => void;
}

/**
 * Composes the modular hex board (Mapa → Terrenos → Hexágonos) with a
 * non-invasive piece + effects overlay driven entirely by the global
 * GameState. The board and its layers remain presentation-only;
 * movement rules live in MovementEngine, combat in CombatEngine — this
 * component only *displays* their results.
 */
export function BoardWithPieces({ map = ACTIVE_MAP, onTileClick }: BoardWithPiecesProps) {
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

  const combatActive = combatTick !== null && lastCombat?.id === combatTick;

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
    } else {
      selectPiece(piece.id === selectedPieceId ? null : piece.id);
    }
    onTileClick?.(piece.currentRow, piece.currentColumn);
  };

  const handleTileClick = (row: number, col: number) => {
    if (legalMoves.has(`${row}-${col}`)) {
      moveSelectedTo(row, col);
    }
    onTileClick?.(row, col);
  };

  return (
    <HexBoard map={map} legalTiles={legalMoves} onTileClick={handleTileClick}>
      <HexEffectsLayer size={HEX_SIZE} lastCombat={lastCombat} active={combatActive} />
      <HexPieceLayer
        pieces={pieces}
        size={HEX_SIZE}
        selectedPieceId={selectedPieceId}
        onPieceClick={handlePieceClick}
        lastCombat={lastCombat}
        combatActive={combatActive}
        justRevealed={justRevealed}
      />
    </HexBoard>
  );
}

export { GameEngine };
