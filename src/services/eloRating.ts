// Sprint RANKING-01 — cálculo de Rating (Elo padrão) e patente
// derivada. Fonte única, pura e testável (sem I/O, sem `ctx.storage`,
// sem conhecimento de conta/sessão) — o servidor (`AccountsRoom`) é
// quem decide QUANDO chamar isso; este arquivo só sabe fazer conta.
// Nunca importado pelo cliente para "calcular" um resultado — só para
// funções auxiliares de exibição pura como `getRankTier` (Fase 4, "o
// frontend nunca calcula o Rating oficial").

import type { RankTier } from "@/types/ranking";

/** Fator K — Direcionamento Oficial / Fase 3. */
export const ELO_K_FACTOR = 32;

export interface EloUpdateResult {
  newRatingA: number;
  newRatingB: number;
}

/**
 * Elo padrão: `expectedA = 1 / (1 + 10^((ratingB-ratingA)/400))`.
 * `scoreA` é 1 (A venceu) ou 0 (A perdeu) — nunca fracionário nesta
 * sprint (sem empates no Conflito). Nunca deixa o Rating ir abaixo de
 * 0 (Fase 8 — "nunca permitir Rating negativo").
 */
export function calculateEloUpdate(ratingA: number, ratingB: number, scoreA: 0 | 1): EloUpdateResult {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreB = scoreA === 1 ? 0 : 1;

  const newRatingA = Math.max(0, Math.round(ratingA + ELO_K_FACTOR * (scoreA - expectedA)));
  const newRatingB = Math.max(0, Math.round(ratingB + ELO_K_FACTOR * (scoreB - expectedB)));

  return { newRatingA, newRatingB };
}

/**
 * Sprint RANKING-02 — Fase 7. `wins / (wins+losses) * 100`, arredondado
 * a 1 casa decimal — idêntico a `wins / rankedMatches * 100` (cada
 * partida ranqueada de um jogador é sempre vitória OU derrota, nunca
 * as duas, então `rankedMatches === wins + losses`). Fonte única —
 * antes calculado separadamente (e igual) em `AccountsRoom.toMyStatsData`
 * e `getLeaderboardRows`; ambos passam a chamar isto.
 */
export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total <= 0) return 0;
  return Math.round((wins / total) * 1000) / 10;
}

/** Patentes — Fase 4. Derivada do Rating; nunca persistida separadamente. */
export function getRankTier(rating: number): RankTier {
  if (rating < 400) return "RECRUTA";
  if (rating < 600) return "SOLDADO";
  if (rating < 800) return "CABO";
  if (rating < 1000) return "SARGENTO";
  if (rating < 1200) return "TENENTE";
  if (rating < 1400) return "CAPITÃO";
  if (rating < 1600) return "MAJOR";
  if (rating < 1800) return "CORONEL";
  return "GENERAL";
}
