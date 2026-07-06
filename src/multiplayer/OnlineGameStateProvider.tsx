import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { GameStateContext, type GameStateApi } from "@/hooks/useGameState";
import { GameEngine } from "@/services/gameEngine";
import type { GameAction, GameState } from "@/types/gameState";
import type { PieceId } from "@/types/piece";
import { getNetworkClient } from "./networkSingleton";

export interface OnlineGameStateProviderProps {
  initialState: GameState;
  children: ReactNode;
}

/**
 * Alimenta o mesmo `GameStateContext` que `GameStateProvider` (partida
 * local), mas a partir de eventos de rede em vez do reducer local. O
 * cliente NUNCA chama `GameEngine.reduce` para decidir o resultado de
 * uma ação — só usa `GameEngine.selectedPiece`/`legalMovesForSelection`
 * (leituras puras, sem regra nova) para derivar o que a Interface
 * precisa mostrar a partir do estado que o servidor já confirmou
 * (doc 10 — "o estado da partida nunca deverá ser reconstruído pelo
 * cliente").
 */
export function OnlineGameStateProvider({ initialState, children }: OnlineGameStateProviderProps) {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    const client = getNetworkClient();
    return client.onEvent((event) => {
      if (event.type === "ActionApplied" || event.type === "GameFinished") {
        setState(event.state);
      }
    });
  }, []);

  const selectPiece = useCallback((pieceId: PieceId | null) => {
    getNetworkClient().send({ type: "SelectPiece", pieceId });
  }, []);

  const moveSelectedTo = useCallback((row: number, col: number) => {
    getNetworkClient().send({ type: "MovePiece", row, column: col });
  }, []);

  // Fim de partida/reset local não fazem sentido online — a sala inteira
  // é quem decide (ainda não implementado nesta sprint); mantidos como
  // no-ops para a Interface continuar funcionando sem checar o modo.
  const clearLastCombat = useCallback(() => {}, []);
  const reset = useCallback(() => {}, []);

  const dispatch = useCallback((action: GameAction) => {
    if (action.type === "END_TURN") {
      getNetworkClient().send({ type: "EndTurn" });
    }
    // Outras ações (RESET/CLEAR_LAST_COMBAT) não têm efeito de rede —
    // o servidor é a única autoridade sobre elas nesta sprint.
  }, []);

  const selectedPiece = useMemo(() => GameEngine.selectedPiece(state), [state]);
  const legalMoves = useMemo(() => GameEngine.legalMovesForSelection(state), [state]);

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
    [state, selectedPiece, legalMoves, selectPiece, moveSelectedTo, clearLastCombat, reset, dispatch],
  );

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}
