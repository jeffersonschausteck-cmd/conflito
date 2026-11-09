import { createContext, useContext, useEffect, useRef, useState, type Dispatch } from "react";
import type { GameAction, GameState, Player } from "@/types/gameState";

/**
 * Relógio da partida (ritmos Rápida/Relâmpago, documento 04 seção 17): tempo total de cada jogador
 * e tempo da jogada. Tempo é orquestração, não regra do Motor, então vive aqui (igual ao cronômetro
 * da partida). Quando o tempo da jogada acaba, o jogo faz a jogada automática segura; quando o tempo
 * total de um jogador zera, ele perde. Só o jogador humano é cobrado (a IA joga em segundos).
 */
export interface MatchClocks {
  BLUE: number;
  RED: number;
  /** Tempo que resta da jogada atual. */
  turnRemainingMs: number;
  turnMs: number;
}

export const MatchClockContext = createContext<MatchClocks | null>(null);

/** Relógio atual, ou null nos ritmos sem relógio (Clássica) e nas partidas online. */
export function useMatchClocks(): MatchClocks | null {
  return useContext(MatchClockContext);
}

export function useMatchClockEngine(state: GameState, dispatch: Dispatch<GameAction>, human: Player, enabled: boolean): MatchClocks | null {
  const rules = enabled ? state.config.rules : undefined;
  const bank = useRef<{ BLUE: number; RED: number }>({ BLUE: rules?.clockMs ?? 0, RED: rules?.clockMs ?? 0 });
  const turnStart = useRef(0);
  const lastTurn = useRef(state.turnNumber);
  const lastPlayer = useRef<Player>(state.currentPlayer);
  const firedTurn = useRef<number | null>(null);
  const endedAt = useRef<number | null>(null);
  const [, setTick] = useState(0);
  if (turnStart.current === 0) turnStart.current = Date.now();

  // Troca de turno: desconta do jogador anterior o tempo que ele gastou.
  if (rules && state.turnNumber !== lastTurn.current) {
    const now = Date.now();
    bank.current[lastPlayer.current] = Math.max(0, bank.current[lastPlayer.current] - (now - turnStart.current));
    turnStart.current = now;
    lastTurn.current = state.turnNumber;
    lastPlayer.current = state.currentPlayer;
  }
  if (state.gameOver && endedAt.current === null) endedAt.current = Date.now();

  useEffect(() => {
    if (!rules || state.gameOver) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [rules, state.gameOver]);

  const now = endedAt.current ?? Date.now();
  const elapsed = rules ? Math.max(0, now - turnStart.current) : 0;
  const cur = state.currentPlayer;
  const clocks: MatchClocks | null = rules
    ? {
        BLUE: Math.max(0, bank.current.BLUE - (cur === "BLUE" ? elapsed : 0)),
        RED: Math.max(0, bank.current.RED - (cur === "RED" ? elapsed : 0)),
        turnRemainingMs: Math.max(0, rules.turnMs - elapsed),
        turnMs: rules.turnMs,
      }
    : null;

  // Cobrança do jogador humano: jogada automática no fim do tempo da jogada; derrota no fim do relógio total.
  useEffect(() => {
    if (!rules || !clocks || state.gameOver || cur !== human) return;
    if (clocks[cur] <= 0) {
      dispatch({ type: "TIME_OUT", player: cur });
    } else if (clocks.turnRemainingMs <= 0 && firedTurn.current !== state.turnNumber) {
      firedTurn.current = state.turnNumber;
      dispatch({ type: "AUTO_MOVE" });
    }
  });

  return clocks;
}
