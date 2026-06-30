import { useCallback, useReducer } from "react";
import {
  boardReducer,
  createInitialBoard,
} from "@/services/boardEngine";
import type { BoardAction, BoardState, TileId } from "@/types/board";

export interface UseBoardOptions {
  rows?: number;
  cols?: number;
  /**
   * Hook for future multiplayer. Every dispatched action is forwarded
   * here so a transport layer (WebSocket, WebRTC) can broadcast it.
   */
  onAction?: (action: BoardAction, next: BoardState) => void;
}

export interface UseBoardApi {
  state: BoardState;
  dispatch: (action: BoardAction) => void;
  selectTile: (tileId: TileId) => void;
  clearSelection: () => void;
  reset: () => void;
}

export function useBoard(options: UseBoardOptions = {}): UseBoardApi {
  const { rows, cols, onAction } = options;
  const [state, baseDispatch] = useReducer(
    boardReducer,
    undefined,
    () => createInitialBoard(rows, cols),
  );

  const dispatch = useCallback(
    (action: BoardAction) => {
      baseDispatch(action);
      if (onAction) {
        // Compute next state for transport — keeps the reducer the
        // single source of truth and avoids drift with subscribers.
        onAction(action, boardReducer(state, action));
      }
    },
    [onAction, state],
  );

  const selectTile = useCallback(
    (tileId: TileId) => dispatch({ type: "SELECT_TILE", tileId }),
    [dispatch],
  );
  const clearSelection = useCallback(
    () => dispatch({ type: "CLEAR_SELECTION" }),
    [dispatch],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), [dispatch]);

  return { state, dispatch, selectTile, clearSelection, reset };
}
