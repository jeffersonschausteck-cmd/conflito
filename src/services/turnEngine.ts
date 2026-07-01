import { MovementEngine } from "@/services/movementEngine";
import type { GameState, Player } from "@/types/gameState";
import { playerToOwner } from "@/types/gameState";
import type { BoardBounds } from "@/types/movement";

/**
 * TurnEngine — pure, single source of truth for turn lifecycle.
 *
 * Responsibilities (SRP):
 *   - startTurn(player)     → prepare a fresh turn (unlock actions)
 *   - endTurn(player)       → close the current turn (lock, advance counter)
 *   - switchPlayer()        → hand control to the opposing side
 *   - checkVictory(state)   → foundation win-condition hook
 *
 * Rules (v0.1):
 *   - Exactly ONE action per turn. `actionLocked` becomes true the moment
 *     a move / combat resolves, and only clears when the next turn starts.
 *   - No other subsystem is allowed to flip `currentPlayer` directly.
 *   - Movement / Combat / AI modules stay untouched — GameEngine is the
 *     coordinator that calls into TurnEngine after their pure results.
 */

export interface TurnSlice {
  currentPlayer: Player;
  turnNumber: number;
  actionLocked: boolean;
  gameOver: boolean;
  winner: Player | null;
}

function opposite(p: Player): Player {
  return p === "BLUE" ? "RED" : "BLUE";
}

export const TurnEngine = {
  initial(startingPlayer: Player = "BLUE"): TurnSlice {
    return {
      currentPlayer: startingPlayer,
      turnNumber: 1,
      actionLocked: false,
      gameOver: false,
      winner: null,
    };
  },

  /** Begin a turn for `player`. Unlocks actions. */
  startTurn(slice: TurnSlice, player: Player): TurnSlice {
    if (slice.gameOver) return slice;
    return { ...slice, currentPlayer: player, actionLocked: false };
  },

  /** Close the current turn. Locks further actions this turn. */
  endTurn(slice: TurnSlice): TurnSlice {
    if (slice.gameOver) return slice;
    return { ...slice, actionLocked: true };
  },

  /** Hand control to the opposing player and increment the turn counter. */
  switchPlayer(slice: TurnSlice): TurnSlice {
    if (slice.gameOver) return slice;
    const next = opposite(slice.currentPlayer);
    return {
      ...slice,
      currentPlayer: next,
      turnNumber: slice.turnNumber + 1,
      actionLocked: false,
    };
  },

  /** Combined helper: end current player's turn, then hand off. */
  completeTurn(slice: TurnSlice): TurnSlice {
    return TurnEngine.switchPlayer(TurnEngine.endTurn(slice));
  },

  /**
   * Foundation win-condition hook.
   *
   * A player loses if they have no living piece with a legal action
   * (i.e. no movable piece with at least one in-bounds neighbour that
   * isn't friendly-occupied). Returns the winner, or null if the game
   * continues.
   */
  checkVictory(state: GameState): Player | null {
    const bounds: BoardBounds = { rows: state.config.rows, cols: state.config.cols };
    const hasAction = (player: Player): boolean => {
      const owner = playerToOwner(player);
      for (const p of state.pieces) {
        if (!p.isAlive || p.owner !== owner || !p.canMove) continue;
        const moves = MovementEngine.getLegalMoves(p, bounds);
        for (const m of moves) {
          const occupant = state.pieces.find(
            (q) =>
              q.isAlive && q.currentRow === m.row && q.currentColumn === m.column,
          );
          if (!occupant || occupant.owner !== owner) return true;
        }
      }
      return false;
    };

    const blueAlive = state.pieces.some((p) => p.isAlive && p.owner === "blue");
    const redAlive = state.pieces.some((p) => p.isAlive && p.owner === "red");
    if (!blueAlive) return "RED";
    if (!redAlive) return "BLUE";
    if (!hasAction("BLUE")) return "RED";
    if (!hasAction("RED")) return "BLUE";
    return null;
  },
};

export type TurnEngineType = typeof TurnEngine;
