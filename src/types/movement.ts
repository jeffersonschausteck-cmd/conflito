import type { Piece, PieceId } from "./piece";

/** A single board coordinate. Serializable for netcode. */
export interface Coord {
  row: number;
  column: number;
}

/** A proposed or executed move. Serializable for netcode + replays. */
export interface Move {
  pieceId: PieceId;
  from: Coord;
  to: Coord;
}

/** Result of executing a move against a piece collection. */
export interface MoveResult {
  pieces: Piece[];
  move: Move;
}

/** Board dimensions handed to the engine. */
export interface BoardBounds {
  rows: number;
  cols: number;
}
