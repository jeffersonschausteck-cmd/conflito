import type { Pace } from "@/types/gameState";

/**
 * Modos de jogo (docs/04-Regras.md, seções 17 e 19). Os três modos têm as mesmas regras e diferem só no
 * tamanho do tabuleiro e na quantidade de peças (ver `battleFormat.ts`). Aqui fica só a liberação de
 * cada modo.
 */

/**
 * Modos liberados para jogar. Um modo em `false` aparece como "Em breve" e não pode ser escolhido.
 */
export const PACES_ENABLED: Record<Pace, boolean> = { classic: true, rapid: true, blitz: true };

/** Modo efetivo: o escolhido se estiver liberado, senão a Partida Intensa. */
export function effectivePace(pace: Pace | undefined): Pace {
  const p = pace ?? "classic";
  return PACES_ENABLED[p] ? p : "classic";
}

export const PACE_LABEL: Record<Pace, string> = { classic: "Partida Intensa", rapid: "Partida Normal", blitz: "Partida Rápida" };
