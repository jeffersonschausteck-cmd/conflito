import { useCallback, useMemo } from "react";
import { MovementEngine } from "@/services/movementEngine";
import { usePieces } from "@/hooks/usePieces";
import type { Coord } from "@/types/movement";
import type { Piece, PieceId } from "@/types/piece";

export interface UseMovementOptions {
  rows?: number;
  cols?: number;
}

export interface UseMovementApi {
  pieces: Piece[];
  selectedPiece: Piece | null;
  selectedPieceId: PieceId | null;
  /** Map-friendly set of legal tile keys ("row-col") for the selected piece. */
  legalMoves: Set<string>;
  /** Click handler for a piece. Toggles selection. */
  onPieceClick: (piece: Piece) => void;
  /** Click handler for a tile. Executes a move when legal; otherwise clears. */
  onTileClick: (coord: Coord) => void;
  reset: () => void;
}

/**
 * Glue layer between the piece state and the pure MovementEngine.
 * All movement logic stays inside MovementEngine — this hook only
 * forwards events and exposes derived state to the UI.
 *
 * Designed so a future NetworkTransport / AIAgent can replace
 * `onTileClick` with an equivalent intent dispatch.
 */
export function useMovement(options: UseMovementOptions = {}): UseMovementApi {
  const rows = options.rows ?? 10;
  const cols = options.cols ?? 10;
  const bounds = useMemo(() => ({ rows, cols }), [rows, cols]);

  const {
    pieces,
    selectedPiece,
    selectedPieceId,
    selectPiece,
    movePiece,
    reset,
  } = usePieces({ rows, cols });

  const legalMoves = useMemo(
    () => MovementEngine.legalMoveSet(selectedPiece, bounds),
    [selectedPiece, bounds],
  );

  const onPieceClick = useCallback(
    (piece: Piece) => {
      selectPiece(piece.id === selectedPieceId ? null : piece.id);
    },
    [selectPiece, selectedPieceId],
  );

  const onTileClick = useCallback(
    (coord: Coord) => {
      if (!selectedPiece) return;
      if (!MovementEngine.isLegalMove(selectedPiece, coord, bounds)) {
        selectPiece(null);
        return;
      }
      // Delegate the actual mutation to PieceManager via usePieces.
      // MovementEngine.execute is also available for server-authoritative paths.
      movePiece(selectedPiece.id, coord.row, coord.column);
      selectPiece(null);
    },
    [selectedPiece, bounds, movePiece, selectPiece],
  );

  return {
    pieces,
    selectedPiece,
    selectedPieceId,
    legalMoves,
    onPieceClick,
    onTileClick,
    reset,
  };
}
