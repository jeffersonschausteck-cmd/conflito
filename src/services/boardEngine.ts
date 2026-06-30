import {
  BOARD_COLS,
  BOARD_ROWS,
  type BoardAction,
  type BoardState,
  type Tile,
  tileId,
} from "@/types/board";

/**
 * Pure factory for an empty board. Pure so it can be reused on both
 * the client and a future authoritative server.
 */
export function createInitialBoard(
  rows: number = BOARD_ROWS,
  cols: number = BOARD_COLS,
): BoardState {
  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        id: tileId(row, col),
        row,
        col,
        occupied: false,
        highlighted: false,
        selected: false,
      });
    }
  }
  return {
    rows,
    cols,
    tiles,
    selectedTileId: null,
    highlightedTileIds: [],
  };
}

/**
 * Pure reducer. Every state transition flows through here so the same
 * function can later be driven by remote actions over the network.
 */
export function boardReducer(
  state: BoardState,
  action: BoardAction,
): BoardState {
  switch (action.type) {
    case "SELECT_TILE": {
      if (state.selectedTileId === action.tileId) return state;
      return {
        ...state,
        selectedTileId: action.tileId,
        tiles: state.tiles.map((t) => ({
          ...t,
          selected: t.id === action.tileId,
        })),
      };
    }
    case "CLEAR_SELECTION": {
      if (state.selectedTileId === null) return state;
      return {
        ...state,
        selectedTileId: null,
        tiles: state.tiles.map((t) =>
          t.selected ? { ...t, selected: false } : t,
        ),
      };
    }
    case "HIGHLIGHT_TILES": {
      const set = new Set(action.tileIds);
      return {
        ...state,
        highlightedTileIds: action.tileIds,
        tiles: state.tiles.map((t) => ({
          ...t,
          highlighted: set.has(t.id),
        })),
      };
    }
    case "CLEAR_HIGHLIGHTS": {
      if (state.highlightedTileIds.length === 0) return state;
      return {
        ...state,
        highlightedTileIds: [],
        tiles: state.tiles.map((t) =>
          t.highlighted ? { ...t, highlighted: false } : t,
        ),
      };
    }
    case "RESET":
      return createInitialBoard(state.rows, state.cols);
    default:
      return state;
  }
}
