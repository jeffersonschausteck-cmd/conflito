// Global game state model. Serializable so it can be persisted or
// later mirrored across the network for multiplayer.

import type { BoardState } from "@/types/board";
import type { Piece, PieceId, PlayerOwner } from "@/types/piece";
import type { CombatResult } from "@/types/combat";

/** Canonical player identifier used by the game state. */
export type Player = "BLUE" | "RED";

export const ownerToPlayer = (owner: PlayerOwner): Player =>
  owner === "blue" ? "BLUE" : "RED";

export const playerToOwner = (player: Player): PlayerOwner =>
  player === "BLUE" ? "blue" : "red";

export interface GameStateConfig {
  rows: number;
  cols: number;
}

/**
 * Single source of truth for the game session. UI components consume
 * this read-only and dispatch intents through GameEngine — they never
 * mutate the state directly.
 */
export interface GameState {
  config: GameStateConfig;
  board: BoardState;
  pieces: Piece[];
  selectedPieceId: PieceId | null;
  currentPlayer: Player;
  /** Monotonic turn counter starting at 1. Owned by TurnEngine. */
  turnNumber: number;
  /**
   * True while the active player has already consumed their single
   * action for the current turn. Owned by TurnEngine — no other
   * subsystem may set this.
   */
  actionLocked: boolean;
  /** True once a victory condition has been detected. */
  gameOver: boolean;
  /** Winner set by TurnEngine.checkVictory, or null if ongoing. */
  winner: Player | null;
  /**
   * Most recent combat resolution, or null if none has occurred since
   * the last RESET. UI reads this to drive flash / shake feedback and
   * reveal panels — write-only from the engine.
   */
  lastCombat: CombatResult | null;
}

/** Discriminated-union action set — extensible for future systems. */
export type GameAction =
  | { type: "SELECT_PIECE"; pieceId: PieceId | null }
  | { type: "MOVE_SELECTED"; row: number; column: number }
  | { type: "END_TURN" }
  | { type: "CLEAR_LAST_COMBAT" }
  | { type: "RESET" };

