import { useCallback, useMemo, useState } from "react";
import { InitialSetup } from "@/services/initialSetup";
import { PieceManager } from "@/services/pieceManager";
import type { Piece, PieceId } from "@/types/piece";

export interface UsePiecesOptions {
  rows?: number;
  cols?: number;
}

export interface UsePiecesApi {
  pieces: Piece[];
  selectedPieceId: PieceId | null;
  selectedPiece: Piece | null;
  selectPiece: (id: PieceId | null) => void;
  /** Reserved for the future movement system — wired now, gated later. */
  movePiece: (id: PieceId, row: number, column: number) => void;
  reset: () => void;
}

/**
 * React adapter around PieceManager. Movement is exposed but the UI
 * does not call it yet — the rules/movement system plugs in later.
 */
export function usePieces(options: UsePiecesOptions = {}): UsePiecesApi {
  const { rows, cols } = options;
  const [pieces, setPieces] = useState<Piece[]>(() =>
    InitialSetup.generate({ rows, cols }),
  );
  const [selectedPieceId, setSelectedPieceId] = useState<PieceId | null>(null);

  const selectPiece = useCallback(
    (id: PieceId | null) => setSelectedPieceId(id),
    [],
  );

  const movePiece = useCallback(
    (id: PieceId, row: number, column: number) => {
      setPieces((prev) => PieceManager.move(prev, id, row, column));
    },
    [],
  );

  const reset = useCallback(() => {
    setPieces(InitialSetup.generate({ rows, cols }));
    setSelectedPieceId(null);
  }, [rows, cols]);

  const selectedPiece = useMemo(
    () =>
      selectedPieceId
        ? PieceManager.findById(pieces, selectedPieceId) ?? null
        : null,
    [pieces, selectedPieceId],
  );

  return {
    pieces,
    selectedPieceId,
    selectedPiece,
    selectPiece,
    movePiece,
    reset,
  };
}
