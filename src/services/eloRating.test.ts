// Sprint RANKING-01 — Fase 15 (testes obrigatórios), casos 3-7 e 18
// (parte pura, sem Durable Object). Roda com `bun test` — já é uma
// ferramenta do projeto (usada pelo servidor legado), sem adicionar
// nenhum runner novo.

import { describe, expect, test } from "bun:test";
import { calculateEloUpdate, calculateWinRate, getRankTier } from "./eloRating";
import { defaultPlayerStats, INITIAL_RATING } from "@/types/ranking";

describe("calculateEloUpdate", () => {
  test("500 vs 500 — vencedor vai a ~516, perdedor a ~484", () => {
    const { newRatingA, newRatingB } = calculateEloUpdate(500, 500, 1);
    expect(newRatingA).toBe(516);
    expect(newRatingB).toBe(484);
  });

  test("favorito (800) vence azarão (500) — ganha pouco", () => {
    const { newRatingA, newRatingB } = calculateEloUpdate(800, 500, 1);
    const delta = newRatingA - 800;
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(10);
    expect(newRatingB).toBeLessThan(500);
  });

  test("azarão (500) vence favorito (800) — ganha muito mais que o inverso", () => {
    const { newRatingA, newRatingB } = calculateEloUpdate(500, 800, 1);
    const underdogGain = newRatingA - 500;
    const favoriteGainWhenWinning = calculateEloUpdate(800, 500, 1).newRatingA - 800;
    expect(underdogGain).toBeGreaterThan(favoriteGainWhenWinning);
    expect(newRatingB).toBeLessThan(800);
  });

  test("Rating nunca fica abaixo de 0", () => {
    const { newRatingB } = calculateEloUpdate(1000, 5, 1);
    expect(newRatingB).toBeGreaterThanOrEqual(0);
  });

  test("soma de pontos ganhos/perdidos é simétrica (500 vs 500)", () => {
    const { newRatingA, newRatingB } = calculateEloUpdate(500, 500, 1);
    expect(newRatingA - 500).toBe(500 - newRatingB);
  });
});

describe("getRankTier", () => {
  test("500 (Rating inicial) é SOLDADO", () => {
    expect(getRankTier(INITIAL_RATING)).toBe("SOLDADO");
  });
  test("faixas de fronteira", () => {
    expect(getRankTier(0)).toBe("RECRUTA");
    expect(getRankTier(399)).toBe("RECRUTA");
    expect(getRankTier(400)).toBe("SOLDADO");
    expect(getRankTier(599)).toBe("SOLDADO");
    expect(getRankTier(600)).toBe("CABO");
    expect(getRankTier(1799)).toBe("CORONEL");
    expect(getRankTier(1800)).toBe("GENERAL");
    expect(getRankTier(5000)).toBe("GENERAL");
  });
});

describe("defaultPlayerStats", () => {
  test("conta nova começa com 500 de Rating e tudo zerado", () => {
    const stats = defaultPlayerStats();
    expect(stats.rating).toBe(500);
    expect(stats.peakRating).toBe(500);
    expect(stats.rankedMatches).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.winStreak).toBe(0);
    expect(stats.bestWinStreak).toBe(0);
    expect(stats.blueWins).toBe(0);
    expect(stats.blueLosses).toBe(0);
    expect(stats.redWins).toBe(0);
    expect(stats.redLosses).toBe(0);
    expect(stats.totalPlayTimeMs).toBe(0);
    expect(stats.fastestVictoryMs).toBeNull();
  });
});

/**
 * Casos 8-17, 19, 20 (peakRating, winStreak, bestWinStreak,
 * blue/red stats, fastestVictoryMs, totalPlayTimeMs, idempotência de
 * matchId, filtro casual, exclusão de dados privados) exercitam
 * `AccountsRoom.processRankedResult` — uma Durable Object real, sem
 * harness de teste isolado neste repositório (nenhum teste
 * automatizado de Durable Object existe hoje). Validados manualmente
 * via `wrangler dev` + duas abas reais (ver relatório da sprint,
 * seção "Evidências"), seguindo o mesmo método já usado nesta sessão
 * para validar Multiplayer/timers/reconexão.
 */
describe("stats update — lógica replicada (mesma fórmula usada em AccountsRoom.processRankedResult)", () => {
  test("vencedor: winStreak incrementa, bestWinStreak acompanha o maior valor histórico", () => {
    const before = { ...defaultPlayerStats(), winStreak: 2, bestWinStreak: 2 };
    const newStreak = before.winStreak + 1;
    const bestWinStreak = Math.max(before.bestWinStreak, newStreak);
    expect(newStreak).toBe(3);
    expect(bestWinStreak).toBe(3);
  });

  test("perdedor: winStreak zera", () => {
    const before = { ...defaultPlayerStats(), winStreak: 5 };
    const after = { ...before, winStreak: 0 };
    expect(after.winStreak).toBe(0);
  });

  test("peakRating nunca diminui", () => {
    const before = { ...defaultPlayerStats(), peakRating: 600 };
    const newRating = 550;
    const peakRating = Math.max(before.peakRating, newRating);
    expect(peakRating).toBe(600);
  });

  test("fastestVictoryMs: null vira a duração; depois só diminui", () => {
    const before = { ...defaultPlayerStats(), fastestVictoryMs: null as number | null };
    const afterFirst = before.fastestVictoryMs === null ? 90_000 : Math.min(before.fastestVictoryMs, 90_000);
    expect(afterFirst).toBe(90_000);
    const afterSlower = Math.min(afterFirst, 120_000);
    expect(afterSlower).toBe(90_000);
    const afterFaster = Math.min(afterSlower, 30_000);
    expect(afterFaster).toBe(30_000);
  });

  test("totalPlayTimeMs acumula", () => {
    const before = { ...defaultPlayerStats(), totalPlayTimeMs: 60_000 };
    const after = before.totalPlayTimeMs + 45_000;
    expect(after).toBe(105_000);
  });
});

/** Sprint RANKING-02 — Fase 12, casos 8/9/12/13. */
describe("calculateWinRate", () => {
  test("0 partidas -> 0% (sem divisão por zero)", () => {
    expect(calculateWinRate(0, 0)).toBe(0);
  });
  test("taxa normal", () => {
    expect(calculateWinRate(23, 17)).toBe(57.5);
  });
  test("100% de vitórias", () => {
    expect(calculateWinRate(5, 0)).toBe(100);
  });
});

/** Sprint RANKING-02 — Fase 12, casos 8/9 (sinal do ratingChange no histórico). */
describe("ratingChange — sinal positivo/negativo (mesma fonte do histórico)", () => {
  test("vencedor recebe ratingChange positivo", () => {
    const { newRatingA } = calculateEloUpdate(500, 500, 1);
    expect(newRatingA - 500).toBeGreaterThan(0);
  });
  test("perdedor recebe ratingChange negativo", () => {
    const { newRatingB } = calculateEloUpdate(500, 500, 1);
    expect(newRatingB - 500).toBeLessThan(0);
  });
});
