import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { GameEngine } from "@/services/gameEngine";
import type {
  GameAction,
  GameState,
  GameStateConfig,
} from "@/types/gameState";
import type { Piece, PieceId } from "@/types/piece";
import type { CombatResult } from "@/types/combat";

export interface GameStateApi {
  state: GameState;
  selectedPiece: Piece | null;
  /** Set of "row-col" keys for tiles that the selected piece may move to. */
  legalMoves: Set<string>;
  /** Most recent combat result, or null. */
  lastCombat: CombatResult | null;
  selectPiece: (id: PieceId | null) => void;
  /** Attempt a move to (row, col); no-op unless legal per MovementEngine. */
  moveSelectedTo: (row: number, col: number) => void;
  /** Clear the last combat record (UI hook after feedback animation ends). */
  clearLastCombat: () => void;
  reset: () => void;
  dispatch: (action: GameAction) => void;
}

const GameStateContext = createContext<GameStateApi | null>(null);

export interface GameStateProviderProps {
  config?: Partial<GameStateConfig>;
  children: ReactNode;
}

/**
 * Provides a single global GameState to the tree. Components read it
 * via `useGameState()` and dispatch intents — they never own the data.
 */
export function GameStateProvider({ config, children }: GameStateProviderProps) {
  const [state, dispatch] = useReducer(
    GameEngine.reduce,
    config ?? null,
    (init) => GameEngine.createInitialState(init ?? undefined),
  );

  const selectPiece = useCallback((id: PieceId | null) => {
    dispatch({ type: "SELECT_PIECE", pieceId: id });
  }, []);

  const moveSelectedTo = useCallback((row: number, col: number) => {
    dispatch({ type: "MOVE_SELECTED", row, column: col });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const clearLastCombat = useCallback(() => {
    dispatch({ type: "CLEAR_LAST_COMBAT" });
  }, []);

  const selectedPiece = useMemo(
    () => GameEngine.selectedPiece(state),
    [state],
  );

  const legalMoves = useMemo(
    () => GameEngine.legalMovesForSelection(state),
    [state],
  );

  const value = useMemo<GameStateApi>(
    () => ({
      state,
      selectedPiece,
      legalMoves,
      lastCombat: state.lastCombat,
      selectPiece,
      moveSelectedTo,
      clearLastCombat,
      reset,
      dispatch,
    }),
    [
      state,
      selectedPiece,
      legalMoves,
      selectPiece,
      moveSelectedTo,
      clearLastCombat,
      reset,
    ],
  );

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState(): GameStateApi {
  const ctx = useContext(GameStateContext);
  if (!ctx) {
    throw new Error("useGameState must be used within a <GameStateProvider />");
  }
  return ctx;
}
