// Global game state model. Serializable so it can be persisted or
// later mirrored across the network for multiplayer.

import type { Tile } from "@/types/board";
import type { Piece, PieceId, PlayerOwner } from "@/types/piece";

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
  board: Tile[][];
  pieces: Piece[];
  selectedPieceId: PieceId | null;
  currentPlayer: Player;
}

/** Discriminated-union action set — extensible for future systems. */
export type GameAction =
  | { type: "SELECT_PIECE"; pieceId: PieceId | null }
  | { type: "RESET" };
