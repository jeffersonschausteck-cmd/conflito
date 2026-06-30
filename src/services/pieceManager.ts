import {
  type Piece,
  type PieceId,
  type PieceType,
  type PlayerOwner,
  pieceId,
} from "@/types/piece";

/**
 * Pure, immutable piece collection operations. The manager never
 * mutates its input — every method returns a new array. This keeps
 * the engine compatible with React state and future server snapshots.
 *
 * Following SRP: this service knows about pieces only. Movement
 * legality, combat resolution, and turn order live elsewhere.
 */
export const PieceManager = {
  /** Build a piece with sensible defaults. */
  create(params: {
    owner: PlayerOwner;
    pieceType: PieceType;
    rank: number;
    row: number;
    column: number;
    index: number;
    canMove?: boolean;
    isRevealed?: boolean;
  }): Piece {
    const {
      owner,
      pieceType,
      rank,
      row,
      column,
      index,
      canMove = true,
      isRevealed = false,
    } = params;
    return {
      id: pieceId(owner, pieceType, index),
      owner,
      pieceType,
      rank,
      canMove,
      isAlive: true,
      isRevealed,
      currentRow: row,
      currentColumn: column,
    };
  },

  /** Remove a piece by id. Returns a new array. */
  remove(pieces: Piece[], id: PieceId): Piece[] {
    return pieces.filter((p) => p.id !== id);
  },

  /** Mark a piece as dead (kept in the array for replays / stats). */
  kill(pieces: Piece[], id: PieceId): Piece[] {
    return pieces.map((p) => (p.id === id ? { ...p, isAlive: false } : p));
  },

  /**
   * Move a piece to a new position. Performs NO rule validation —
   * legality is the rules service's responsibility (future module).
   */
  move(pieces: Piece[], id: PieceId, row: number, column: number): Piece[] {
    return pieces.map((p) =>
      p.id === id ? { ...p, currentRow: row, currentColumn: column } : p,
    );
  },

  /** O(n) lookup by id. */
  findById(pieces: Piece[], id: PieceId): Piece | undefined {
    return pieces.find((p) => p.id === id);
  },

  /** Return the live piece on a given tile, if any. */
  findAt(pieces: Piece[], row: number, column: number): Piece | undefined {
    return pieces.find(
      (p) => p.isAlive && p.currentRow === row && p.currentColumn === column,
    );
  },

  /** All living pieces for a given owner. */
  byOwner(pieces: Piece[], owner: PlayerOwner): Piece[] {
    return pieces.filter((p) => p.isAlive && p.owner === owner);
  },

  /** Generic search predicate. */
  search(pieces: Piece[], predicate: (p: Piece) => boolean): Piece[] {
    return pieces.filter(predicate);
  },
};
