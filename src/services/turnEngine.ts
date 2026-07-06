import type { GameState, Player } from "@/types/gameState";

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
   * Official win condition (Documento 04 §12-13): a player wins the
   * instant the opponent's Bandeira is captured. There is no other
   * victory condition in v1.0 — no draw, no elimination, no stalemate.
   */
  checkVictory(state: GameState): Player | null {
    const flagAlive = (owner: "blue" | "red"): boolean =>
      state.pieces.some(
        (p) => p.isAlive && p.owner === owner && p.pieceType === "flag",
      );

    if (!flagAlive("blue")) return "RED";
    if (!flagAlive("red")) return "BLUE";
    return null;
  },
};

export type TurnEngineType = typeof TurnEngine;
