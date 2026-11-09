import { useEffect, useRef, useState } from "react";
import { AIEngine } from "@/services/aiEngine";
import { useGameState } from "@/hooks/useGameState";
import type { Player } from "@/types/gameState";

export interface UseAITurnOptions {
  /** Which side the AI plays. Defaults to RED. */
  aiPlayer?: Player;
  /** Minimum "thinking" delay (ms) before selecting. */
  minDelay?: number;
  /** Maximum "thinking" delay (ms). */
  maxDelay?: number;
  /** Delay between selection and move execution (ms). */
  moveDelay?: number;
  /** Disable the AI entirely (e.g. hotseat mode). */
  enabled?: boolean;
}

/**
 * Drives the AI opponent. Watches GameState and, whenever it becomes
 * the AI's turn, computes a decision via AIEngine and dispatches it
 * through GameEngine's public intents — never touches state directly.
 */
export function useAITurn(options: UseAITurnOptions = {}) {
  const {
    aiPlayer = "RED",
    minDelay = 500,
    maxDelay = 1200,
    moveDelay = 350,
    enabled = true,
  } = options;

  const { state, selectPiece, moveSelectedTo } = useGameState();
  const [thinking, setThinking] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (state.currentPlayer !== aiPlayer) return;
    if (busyRef.current) return;

    const decision = AIEngine.chooseMove(state, aiPlayer);
    if (!decision) return;

    busyRef.current = true;
    setThinking(true);

    const thinkMs =
      minDelay + Math.floor(Math.random() * Math.max(1, maxDelay - minDelay));

    const t1 = setTimeout(() => {
      // Highlight briefly.
      selectPiece(decision.piece.id);
      // Este segundo temporizador não é cancelado na limpeza de propósito: selecionar a peça muda o
      // estado e refaz este efeito, e a jogada precisa acontecer mesmo assim. (Antes o código tentava
      // guardar o temporizador em `t1._inner`, o que dá erro no navegador porque `t1` é um número.)
      setTimeout(() => {
        moveSelectedTo(decision.target.row, decision.target.column);
        setThinking(false);
        busyRef.current = false;
      }, moveDelay);
    }, thinkMs);

    return () => {
      clearTimeout(t1);
      setThinking(false);
      busyRef.current = false;
    };
  }, [
    state,
    enabled,
    aiPlayer,
    minDelay,
    maxDelay,
    moveDelay,
    selectPiece,
    moveSelectedTo,
  ]);

  return { thinking, aiPlayer };
}
