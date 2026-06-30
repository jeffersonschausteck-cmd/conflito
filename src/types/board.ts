// Core board engine types. Designed to be serializable for future
// multiplayer (network sync, replays, server-authoritative state).

export type TileId = string; // canonical form: `${row}-${col}`

/** Coordinate on the board. (0,0) is top-left. */
export interface Coord {
  row: number;
  col: number;
}

/**
 * A single tile on the board. Kept intentionally minimal and
 * serializable — no functions, no class instances — so it can be
 * shipped over the wire to other players in future netcode.
 */
export interface Tile {
  id: TileId;
  row: number;
  col: number;
  /** Reserved for future pieces. No piece system yet. */
  occupied: boolean;
  /** Visually highlighted (e.g. reachable / target hint). */
  highlighted: boolean;
  /** Currently selected by the local player. */
  selected: boolean;
}

/** Authoritative board state. Future server snapshots match this shape. */
export interface BoardState {
  rows: number;
  cols: number;
  tiles: Tile[]; // length === rows * cols, row-major order
  selectedTileId: TileId | null;
  highlightedTileIds: TileId[];
}

/** Player identity. Placeholder for future multiplayer wiring. */
export interface PlayerRef {
  id: string;
  handle: string;
}

/**
 * Discriminated union of every intent the engine accepts. Designed so
 * the same actions can be produced locally or received from a remote
 * peer / authoritative server.
 */
export type BoardAction =
  | { type: "SELECT_TILE"; tileId: TileId }
  | { type: "CLEAR_SELECTION" }
  | { type: "HIGHLIGHT_TILES"; tileIds: TileId[] }
  | { type: "CLEAR_HIGHLIGHTS" }
  | { type: "RESET" };

export const BOARD_ROWS = 10 as const;
export const BOARD_COLS = 10 as const;

export const tileId = (row: number, col: number): TileId => `${row}-${col}`;
