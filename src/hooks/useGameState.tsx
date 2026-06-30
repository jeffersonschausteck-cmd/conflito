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

export interface GameStateApi {
  state: GameState;
  selectedPiece: Piece | null;
  selectPiece: (id: PieceId | null) => void;
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

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const selectedPiece = useMemo(
    () => GameEngine.selectedPiece(state),
    [state],
  );

  const value = useMemo<GameStateApi>(
    () => ({ state, selectedPiece, selectPiece, reset, dispatch }),
    [state, selectedPiece, selectPiece, reset],
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
