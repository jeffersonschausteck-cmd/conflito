import { PIECES } from "@/config/pieces";
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
 * Rules (Documento 04 §8, §9, §11):
 *   - Most pieces step exactly one tile orthogonally (N/S/E/W).
 *   - The Explorador (scout) moves any number of tiles in a straight
 *     line, stopping the instant it reaches the board edge, a
 *     friendly piece (blocked), or an enemy piece (attack target).
 *   - No diagonal movement for any piece.
 *   - A piece may never land on a tile occupied by its own team, and
 *     may never move through another piece — both are enforced here
 *     so the Motor remains the sole authority on legality (doc 07).
 *   - Terrain obstacles (Sprint 2.5: forest/water/mountain) behave like
 *     a wall — a blocked coordinate can never be entered nor crossed.
 *     The Engine only ever sees a plain `blockedTiles` coordinate set;
 *     it has no notion of "forest" or any concrete map.
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

function movesInLine(piece: Piece): boolean {
  return PIECES[piece.pieceType]?.movimentoEmLinha === true;
}

const NO_BLOCKED_TILES: ReadonlySet<string> = new Set();

export const MovementEngine = {
  /** All legal destination tiles for a given piece under the official rules. */
  getLegalMoves(
    piece: Piece | null | undefined,
    pieces: Piece[],
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): Coord[] {
    if (!piece || !piece.isAlive || !piece.canMove) return [];
    const lineMover = movesInLine(piece);
    const out: Coord[] = [];

    for (const [dr, dc] of ORTHOGONAL_OFFSETS) {
      let row = piece.currentRow + dr;
      let column = piece.currentColumn + dc;

      while (inBounds(row, column, bounds)) {
        if (blockedTiles.has(coordKey({ row, column }))) break;

        const occupant = PieceManager.findAt(pieces, row, column);
        if (occupant) {
          // Cannot cross any piece. An enemy on this tile is a legal
          // attack destination; a friendly piece blocks entirely.
          if (occupant.owner !== piece.owner) out.push({ row, column });
          break;
        }
        out.push({ row, column });
        if (!lineMover) break;
        row += dr;
        column += dc;
      }
    }

    return out;
  },

  /** Quick set-based lookup helper for highlight rendering. */
  legalMoveSet(
    piece: Piece | null | undefined,
    pieces: Piece[],
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): Set<string> {
    return new Set(
      MovementEngine.getLegalMoves(piece, pieces, bounds, blockedTiles).map(coordKey),
    );
  },

  /** True iff `target` is a legal destination for `piece`. */
  isLegalMove(
    piece: Piece | null | undefined,
    pieces: Piece[],
    target: Coord,
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): boolean {
    if (!piece) return false;
    return MovementEngine.getLegalMoves(piece, pieces, bounds, blockedTiles).some(
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
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): MoveResult {
    const piece = PieceManager.findById(pieces, pieceId);
    if (!piece) throw new Error(`MovementEngine: unknown piece ${pieceId}`);
    if (!MovementEngine.isLegalMove(piece, pieces, target, bounds, blockedTiles)) {
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
