// Sprint RANKING-02 — Fase 12 (testes obrigatórios), casos 10/11
// (duração formatada / tempo total formatado). `bun test`.

import { describe, expect, test } from "bun:test";
import { formatClock, formatTimeAgo, formatTotalPlayTime } from "./formatClock";

describe("formatClock (duração de uma partida)", () => {
  test("60000ms -> 01:00", () => {
    expect(formatClock(60_000)).toBe("01:00");
  });
  test("754000ms -> 12:34", () => {
    expect(formatClock(754_000)).toBe("12:34");
  });
});

describe("formatTotalPlayTime (tempo total acumulado)", () => {
  test("0 -> 00h 00m", () => {
    expect(formatTotalPlayTime(0)).toBe("00h 00m");
  });
  test("5400000ms -> 01h 30m", () => {
    expect(formatTotalPlayTime(5_400_000)).toBe("01h 30m");
  });
});

describe("formatTimeAgo", () => {
  const now = 1_000_000_000_000;
  test("menos de 1 minuto -> Agora", () => {
    expect(formatTimeAgo(now - 30_000, now)).toBe("Agora");
  });
  test("2 horas atrás", () => {
    expect(formatTimeAgo(now - 2 * 3_600_000, now)).toBe("Há 2 horas");
  });
  test("exatamente 1 dia -> Ontem", () => {
    expect(formatTimeAgo(now - 24 * 3_600_000, now)).toBe("Ontem");
  });
});
