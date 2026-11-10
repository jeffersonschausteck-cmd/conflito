// Sprint RANKING-01 — tipos compartilhados do sistema competitivo.
// Puro dado (sem lógica) — importado tanto pelo servidor
// (`multiplayer-worker/src/AccountsRoom.ts`/`GameRoom.ts`) quanto pelo
// cliente (telas de Ranking/resultado). O cálculo em si vive em
// `src/services/eloRating.ts`, nunca aqui.

import type { Pace } from "@/types/gameState";

/** Salas por código (hoje) são sempre "casual". "ranked" existe só como
 * estrutura pronta pro matchmaking automático da Sprint RANKING-03 —
 * nenhum fluxo atual cria uma sala "ranked". */
export type MatchType = "casual" | "ranked";

export interface PlayerStats {
  rating: number;
  peakRating: number;

  rankedMatches: number;
  wins: number;
  losses: number;

  winStreak: number;
  bestWinStreak: number;

  blueWins: number;
  blueLosses: number;

  redWins: number;
  redLosses: number;

  totalPlayTimeMs: number;
  fastestVictoryMs: number | null;
}

/** Rating inicial de todo jogador novo (Direcionamento Oficial #1). */
export const INITIAL_RATING = 500;

/** Fonte única dos valores padrão — usada tanto no cadastro de uma
 * conta nova quanto na migração retrocompatível de uma conta antiga
 * sem `stats` (nunca duplicar estes valores em outro lugar). */
export function defaultPlayerStats(): PlayerStats {
  return {
    rating: INITIAL_RATING,
    peakRating: INITIAL_RATING,
    rankedMatches: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestWinStreak: 0,
    blueWins: 0,
    blueLosses: 0,
    redWins: 0,
    redLosses: 0,
    totalPlayTimeMs: 0,
    fastestVictoryMs: null,
  };
}

/** Patentes — Fase 4. Derivada do Rating, nunca salva separadamente. */
export type RankTier =
  | "RECRUTA"
  | "SOLDADO"
  | "CABO"
  | "SARGENTO"
  | "TENENTE"
  | "CAPITÃO"
  | "MAJOR"
  | "CORONEL"
  | "GENERAL";

/** Registro persistente de uma partida ranqueada — Fase 5. */
export interface MatchRecord {
  matchId: string;

  bluePlayerId: string;
  redPlayerId: string;

  winnerId: string;
  loserId: string;

  winnerOwner: "blue" | "red";

  startedAt: number;
  endedAt: number;
  durationMs: number;

  turnCount: number;

  winnerRatingBefore: number;
  winnerRatingAfter: number;
  winnerRatingDelta: number;

  loserRatingBefore: number;
  loserRatingAfter: number;
  loserRatingDelta: number;

  ranked: true;
  /** Modo em que a partida foi jogada (ausente em registros antigos = Partida Intensa). */
  pace?: Pace;
}

/** Entrada pública do Ranking global — Fase 10. Nunca inclui dado privado de conta. */
export interface LeaderboardEntry {
  position: number;
  accountId: string;
  username: string;
  rating: number;
  rankTier: RankTier;
  rankedMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Estatísticas públicas do jogador logado (tela "Sua Posição" — Fase
 * 12/13; Sprint RANKING-02 — reaproveitada e ESTENDIDA pra alimentar o
 * Perfil do Comandante, em vez de criar um evento paralelo). `position`
 * é `null` quando o jogador ainda não completou nenhuma partida
 * ranqueada (Fase 13 — "SEM CLASSIFICAÇÃO").
 */
export interface MyStatsData {
  accountId: string;
  username: string;
  rating: number;
  rankTier: RankTier;
  rankedMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  position: number | null;
  /** Sprint RANKING-02 — campos de `PlayerStats` que o Ranking não precisava, mas o Perfil precisa. */
  peakRating: number;
  winStreak: number;
  bestWinStreak: number;
  blueWins: number;
  blueLosses: number;
  redWins: number;
  redLosses: number;
  totalPlayTimeMs: number;
  fastestVictoryMs: number | null;
}

/**
 * Sprint RANKING-02 — Fase 1. Uma partida do histórico do jogador,
 * JÁ NA PERSPECTIVA DELE (`result`/`opponentId`/`opponentOwner` são
 * relativos a quem pediu — o servidor deriva isso a partir de UM
 * registro canônico por partida, nunca duas cópias divergentes; ver
 * `AccountsRoom.toMatchHistoryEntry`). `ratingBefore`/`ratingAfter`/
 * `ratingChange` só existem numa partida ranqueada.
 */
export interface MatchHistoryEntry {
  matchId: string;
  matchType: MatchType;
  result: "victory" | "defeat";
  opponentId: string;
  opponentNickname: string;
  playerOwner: "blue" | "red";
  opponentOwner: "blue" | "red";
  ratingBefore?: number;
  ratingAfter?: number;
  ratingChange?: number;
  durationMs: number;
  turnNumber: number;
  finishedAt: number;
  finishReason?: "victory" | "forfeit";
  /** Modo em que a partida foi jogada. */
  pace?: Pace;
}

/**
 * Sprint RANKING-02 — Fase 9. Estrutura pronta pro perfil PÚBLICO de
 * outro jogador (RANKING-03+) — mesmos campos de `LeaderboardEntry`
 * sem `position` (que só faz sentido no contexto de uma lista
 * ordenada). Nenhum evento/endpoint usa isto ainda nesta sprint.
 */
export interface PublicProfile {
  accountId: string;
  nickname: string;
  rating: number;
  rankTier: RankTier;
  rankedMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Resultado de Rating relativo a UM jogador específico (before/after/
 * delta) — cada cliente recebe o seu próprio, nunca o do adversário
 * (Fase 14). `null` numa partida casual.
 */
export interface RankingResultView {
  matchType: MatchType;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  /** Modo cuja pontuação mudou. */
  pace?: Pace;
}
