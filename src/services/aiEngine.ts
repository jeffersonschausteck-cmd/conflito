import { MovementEngine } from "@/services/movementEngine";
import { PieceManager } from "@/services/pieceManager";
import type { GameState, Player } from "@/types/gameState";
import { playerToOwner } from "@/types/gameState";
import type { Coord } from "@/types/movement";
import type { Piece } from "@/types/piece";

/**
 * AIEngine — pure move-picking service.
 *
 * The AI is a virtual player: it computes an intended (piece, target)
 * tuple but never mutates state. The caller drives GameEngine using
 * SELECT_PIECE + MOVE_SELECTED so the same validation, combat, and
 * fog-of-war paths run for the AI and a human player.
 *
 * v0.1 heuristics (in priority order):
 *   1. Prefer forward movement (toward the opposing side).
 *   2. Prefer moves that reduce distance to the board center.
 *   3. Never "stay still" (movement is required — one tile per turn).
 *   4. Break ties randomly.
 */

export interface AIDecision {
  piece: Piece;
  target: Coord;
}

interface ScoredMove {
  piece: Piece;
  target: Coord;
  score: number;
}

function forwardDirection(player: Player): 1 | -1 {
  // BLUE sits on the bottom (high row indexes) and advances up (-1).
  // RED sits on the top and advances down (+1).
  return player === "BLUE" ? -1 : 1;
}

export const AIEngine = {
  /**
   * Pick a move for the given player. Returns null when the AI has
   * no legal move (all pieces stuck) — caller should pass turn.
   */
  chooseMove(state: GameState, player: Player): AIDecision | null {
    const owner = playerToOwner(player);
    const own = PieceManager.byOwner(state.pieces, owner).filter(
      (p) => p.canMove,
    );
    if (own.length === 0) return null;

    const bounds = { rows: state.config.rows, cols: state.config.cols };
    const centerRow = (bounds.rows - 1) / 2;
    const centerCol = (bounds.cols - 1) / 2;
    const forward = forwardDirection(player);

    const candidates: ScoredMove[] = [];

    for (const piece of own) {
      const moves = MovementEngine.getLegalMoves(piece, bounds);
      for (const target of moves) {
        // Skip friendly-occupied tiles — GameEngine would reject them.
        const occupant = PieceManager.findAt(
          state.pieces,
          target.row,
          target.column,
        );
        if (occupant && occupant.owner === owner) continue;

        let score = 0;

        // (1) Forward bias.
        const rowDelta = target.row - piece.currentRow;
        if (Math.sign(rowDelta) === forward) score += 10;
        else if (rowDelta === 0) score += 2; // lateral
        else score -= 4; // retreating

        // (2) Center attraction — closer to center is better.
        const distNow =
          Math.abs(piece.currentRow - centerRow) +
          Math.abs(piece.currentColumn - centerCol);
        const distNext =
          Math.abs(target.row - centerRow) +
          Math.abs(target.column - centerCol);
        score += (distNow - distNext) * 3;

        // (3) Light bonus for capturing an enemy (piece is there and hostile).
        if (occupant && occupant.owner !== owner) score += 6;

        candidates.push({ piece, target, score });
      }
    }

    if (candidates.length === 0) return null;

    const maxScore = candidates.reduce(
      (m, c) => (c.score > m ? c.score : m),
      -Infinity,
    );
    const top = candidates.filter((c) => c.score === maxScore);
    const pick = top[Math.floor(Math.random() * top.length)];
    return { piece: pick.piece, target: pick.target };
  },
};

export type AIEngineType = typeof AIEngine;
