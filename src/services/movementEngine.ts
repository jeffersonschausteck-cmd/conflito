import { PieceManager } from "@/services/pieceManager";
import type { Piece, PieceId } from "@/types/piece";
import type { BoardBounds, Coord, Move, MoveResult } from "@/types/movement";

/**
 * MovementEngine — pure, stateless rules service.
 *
 * Responsibilities (SRP):
 *   - Generate legal destination tiles for a piece
 *   - Validate a proposed move
 *   - Execute a move (returns a new pieces array + Move record)
 *   - Cancel a pending move (returns null selection)
 *
 * Version 0.1 rules:
 *   - Movable pieces step exactly one tile orthogonally (N/S/E/W).
 *   - No diagonal movement.
 *   - Occupancy, combat, fog-of-war and victory are intentionally ignored.
 *
 * The engine is pure so it can run identically in:
 *   - the local React app
 *   - a server-authoritative validator (multiplayer)
 *   - an AI search routine (move generation)
 */

const ORTHOGONAL_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], // up
  [1, 0], // down
  [0, -1], // left
  [0, 1], // right
];

function inBounds(row: number, col: number, bounds: BoardBounds): boolean {
  return row >= 0 && row < bounds.rows && col >= 0 && col < bounds.cols;
}

function coordKey(c: Coord): string {
  return `${c.row}-${c.column}`;
}

export const MovementEngine = {
  /** All legal destination tiles for a given piece under v0.1 rules. */
  getLegalMoves(piece: Piece | null | undefined, bounds: BoardBounds): Coord[] {
    if (!piece || !piece.isAlive || !piece.canMove) return [];
    const out: Coord[] = [];
    for (const [dr, dc] of ORTHOGONAL_OFFSETS) {
      const row = piece.currentRow + dr;
      const column = piece.currentColumn + dc;
      if (inBounds(row, column, bounds)) {
        out.push({ row, column });
      }
    }
    return out;
  },

  /** Quick set-based lookup helper for highlight rendering. */
  legalMoveSet(piece: Piece | null | undefined, bounds: BoardBounds): Set<string> {
    return new Set(MovementEngine.getLegalMoves(piece, bounds).map(coordKey));
  },

  /** True iff `target` is a legal destination for `piece`. */
  isLegalMove(
    piece: Piece | null | undefined,
    target: Coord,
    bounds: BoardBounds,
  ): boolean {
    if (!piece) return false;
    return MovementEngine.getLegalMoves(piece, bounds).some(
      (c) => c.row === target.row && c.column === target.column,
    );
  },

  /**
   * Execute a move. Pure: returns a new pieces array.
   * Throws if the move is not legal — callers should pre-validate.
   */
  execute(
    pieces: Piece[],
    pieceId: PieceId,
    target: Coord,
    bounds: BoardBounds,
  ): MoveResult {
    const piece = PieceManager.findById(pieces, pieceId);
    if (!piece) throw new Error(`MovementEngine: unknown piece ${pieceId}`);
    if (!MovementEngine.isLegalMove(piece, target, bounds)) {
      throw new Error(
        `MovementEngine: illegal move ${pieceId} -> ${target.row},${target.column}`,
      );
    }
    const from: Coord = { row: piece.currentRow, column: piece.currentColumn };
    const next = PieceManager.move(pieces, pieceId, target.row, target.column);
    const move: Move = { pieceId, from, to: target };
    return { pieces: next, move };
  },

  /** No-op cancel helper — kept for API symmetry and future pending-move flows. */
  cancel(): null {
    return null;
  },
};

export type MovementEngineType = typeof MovementEngine;
