import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GameEngine } from "@/services/gameEngine";
import type {
  GameAction,
  GameState,
  GameStateConfig,
} from "@/types/gameState";
import type { Piece, PieceId, PlayerOwner } from "@/types/piece";
import type { CombatResult } from "@/types/combat";
import type { MatchType, RankingResultView } from "@/types/ranking";
import { MatchClockContext, useMatchClockEngine } from "@/hooks/useMatchClock";

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
  /**
   * Sprint QA-13 — qual lado o jogador NESTE navegador está de fato
   * jogando. Fonte única de verdade pra tudo que precisa de perspectiva
   * (Fog of War, HUD, tela de vitória/derrota etc.) — offline é sempre
   * `"blue"`; online vem de `flow.onlineOwner` (`GamePage` resolve e
   * repassa pro Provider correto). Nenhum componente deve assumir
   * `"blue"` sozinho — sempre ler `localOwner` daqui.
   */
  localOwner: PlayerOwner;
  /**
   * Sprint TIMER-01 — instante (epoch ms) em que a Partida começou.
   * Mesmo padrão de `localOwner`: tempo é meta de orquestração, não
   * dado do Motor — nunca vive dentro de `GameState`/`GameEngine`.
   * Offline: definido no mount do Provider. Online: vem do servidor
   * (`GameStarted.matchStartTime`), idêntico pros dois jogadores.
   */
  matchStartTime: number | null;
  /**
   * Sprint TIMER-01 — instante (epoch ms) em que a Partida terminou, ou
   * `null` enquanto `state.gameOver` for falso. Uma vez definido, nunca
   * muda — é o valor mostrado nas telas de Vitória/Derrota.
   */
  matchEndTime: number | null;
  /**
   * Sprint REC-01 — prazo (epoch ms) pro ADVERSÁRIO reconectar antes
   * do W.O. (`GameRoom` — `PlayerDisconnected.reconnectDeadline`), ou
   * `null` se ambos estiverem conectados. Mesmo padrão de
   * `matchStartTime`: meta de orquestração, nunca dado do Motor.
   * Offline sempre `null` (não existe "adversário" pra desconectar).
   */
  opponentDisconnectDeadline: number | null;
  /**
   * Sprint REC-01 — distingue uma vitória por combate (bandeira
   * capturada) de uma vitória por W.O. (adversário não reconectou a
   * tempo), pra tela final mostrar o motivo certo. Offline nunca tem
   * W.O., sempre `"victory"` quando `state.gameOver`.
   */
  matchEndReason: "victory" | "forfeit" | "points" | "time" | null;
  /**
   * Sprint RANKING-01 — resultado de Rating desta Partida (Fase 14),
   * relativo a ESTE jogador — nunca calculado no cliente, só exibido.
   * `null` até a partida terminar, ou numa partida casual (o card final
   * mostra "PARTIDA CASUAL / RATING NÃO ALTERADO" nesse caso). Offline
   * nunca tem Rating — sempre `null`.
   */
  rankingResult: RankingResultView | null;
  /**
   * Sprint RANKING-03 — Fase 6: mesmo `matchType` de sempre (Sprint
   * RANKING-01), exposto pra HUD/tela final saberem CASUAL vs
   * RANQUEADA durante toda a batalha. Offline sempre "casual".
   */
  matchType: MatchType;
}

/**
 * Exportado (além do hook) para que `OnlineGameStateProvider`
 * (Sprint MP-02) possa alimentar o mesmo contexto com dados vindos do
 * servidor — assim toda a Interface existente (BoardWithPieces,
 * CommandCenter, PlayerPanel, MatchActionsBar etc.) funciona sem
 * nenhuma mudança, seja a partida local ou online.
 */
export const GameStateContext = createContext<GameStateApi | null>(null);

export interface GameStateProviderProps {
  config?: Partial<GameStateConfig>;
  children: ReactNode;
  /** Sprint QA-13 — offline é sempre `"blue"` (jogador único, sempre o mesmo lado). */
  localOwner?: PlayerOwner;
}

/**
 * Provides a single global GameState to the tree. Components read it
 * via `useGameState()` and dispatch intents — they never own the data.
 */
export function GameStateProvider({ config, children, localOwner = "blue" }: GameStateProviderProps) {
  const [state, dispatch] = useReducer(
    GameEngine.reduce,
    config ?? null,
    (init) => GameEngine.createInitialState(init ?? undefined),
  );

  // Sprint TIMER-01 — offline não tem servidor pra ser autoridade de
  // tempo: o início da Partida é o próprio mount deste Provider (o
  // instante em que `/game` monta com um estado válido).
  // Relógio dos ritmos Rápida/Relâmpago (nulo na Clássica): tempo total, tempo da jogada e jogada automática.
  const clocks = useMatchClockEngine(state, dispatch, localOwner === "blue" ? "BLUE" : "RED", true);
  const [matchStartTime] = useState(() => Date.now());
  const [matchEndTime, setMatchEndTime] = useState<number | null>(null);
  const gameOverHandledRef = useRef(false);
  useEffect(() => {
    if (state.gameOver && !gameOverHandledRef.current) {
      gameOverHandledRef.current = true;
      setMatchEndTime(Date.now());
    }
  }, [state.gameOver]);

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
      localOwner,
      matchStartTime,
      matchEndTime,
      // Sprint REC-01 — offline não tem adversário nem servidor pra
      // detectar desconexão; sempre `null`.
      opponentDisconnectDeadline: null,
      matchEndReason: state.gameOver ? (state.endReason === "points" || state.endReason === "time" ? state.endReason : "victory") : null,
      // Sprint RANKING-01 — offline nunca tem Rating.
      rankingResult: null,
      // Sprint RANKING-03 — offline é sempre casual.
      matchType: "casual",
    }),
    [
      state,
      selectedPiece,
      legalMoves,
      selectPiece,
      moveSelectedTo,
      clearLastCombat,
      reset,
      localOwner,
      matchStartTime,
      matchEndTime,
    ],
  );

  return (
    <GameStateContext.Provider value={value}>
      <MatchClockContext.Provider value={clocks}>{children}</MatchClockContext.Provider>
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
