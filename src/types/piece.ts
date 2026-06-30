// Piece domain model. Serializable so the same shape can be sent over
// the wire to other players in future netcode.

export type PieceId = string;
export type PlayerOwner = "blue" | "red";

/**
 * Generic piece archetypes. Game rules are NOT defined here — this
 * enum is purely a visual/identity tag for now. Ranks and movement
 * rules plug in later via a dedicated rules service.
 */
export type PieceType =
  | "commander"
  | "officer"
  | "scout"
  | "sniper"
  | "engineer"
  | "infantry"
  | "spy"
  | "bomb"
  | "flag";

export interface Piece {
  id: PieceId;
  owner: PlayerOwner;
  pieceType: PieceType;
  /** Numeric rank for future combat resolution. 0 = non-combat. */
  rank: number;
  canMove: boolean;
  isAlive: boolean;
  /** Fog-of-war flag. False = hidden silhouette to the opponent. */
  isRevealed: boolean;
  currentRow: number;
  currentColumn: number;
}

export const pieceId = (
  owner: PlayerOwner,
  pieceType: PieceType,
  index: number,
): PieceId => `${owner}-${pieceType}-${index}`;
