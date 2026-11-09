import { PIECES } from "@/config/pieces";
import type { GameState, MatchRules, Pace, Player } from "@/types/gameState";
import type { Piece, PlayerOwner } from "@/types/piece";

/**
 * Regras do Ritmo da Partida (documento 04, seção 17). Funções puras: relógio de rodadas, Maré e
 * pontos. O tempo real (relógio por jogador, tempo por jogada) fica fora do Motor, na camada que
 * orquestra a partida; aqui só vivem as regras que dependem do estado do tabuleiro.
 */

export const RULES_BY_PACE: Record<Pace, MatchRules | null> = {
  classic: null,
  rapid: { roundLimit: 30, tideStartRound: 18, tideEveryRounds: 3, maxTideRings: 3, clockMs: 5 * 60_000, turnMs: 20_000 },
  blitz: { roundLimit: 20, tideStartRound: 10, tideEveryRounds: 2, maxTideRings: 4, clockMs: 3 * 60_000, turnMs: 15_000 },
};

export const PACE_LABEL: Record<Pace, string> = { classic: "Clássica", rapid: "Rápida", blitz: "Relâmpago" };

/** O contador de turnos do Motor sobe a cada jogada; uma rodada = uma jogada de cada jogador. */
export function roundOf(turnNumber: number): number {
  return Math.floor((turnNumber - 1) / 2) + 1;
}

/** Quantas faixas externas já estão inundadas na rodada dada. */
export function tideRings(round: number, rules: MatchRules | null | undefined): number {
  if (!rules || round < rules.tideStartRound) return 0;
  return Math.min(rules.maxTideRings, 1 + Math.floor((round - rules.tideStartRound) / rules.tideEveryRounds));
}

/** Distância da casa até a borda do campo (0 = faixa externa). */
export function ringIndex(row: number, col: number, rows: number, cols: number): number {
  return Math.min(row, rows - 1 - row, col, cols - 1 - col);
}

/** Quantas rodadas faltam para a próxima faixa ser inundada, ou null se não há mais Maré. */
export function roundsUntilTide(round: number, rules: MatchRules | null | undefined): number | null {
  if (!rules) return null;
  const rings = tideRings(round, rules);
  if (rings >= rules.maxTideRings) return null;
  const next = rules.tideStartRound + rings * rules.tideEveryRounds;
  return Math.max(0, next - round);
}

const IMMUNE = new Set(["bomb", "flag"]);
const isImmune = (p: Piece) => IMMUNE.has(p.pieceType);

/** Casas inundadas na rodada atual. */
export function floodedTiles(state: GameState): Set<string> {
  const out = new Set<string>();
  const rules = state.config.rules;
  const rings = tideRings(roundOf(state.turnNumber), rules);
  if (!rings) return out;
  const { rows, cols } = state.config;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (ringIndex(r, c, rows, cols) < rings) out.add(`${r}-${c}`);
    }
  }
  return out;
}

/**
 * Casas que nenhuma peça pode ocupar ou atravessar: obstáculos do mapa mais as casas inundadas.
 * A casa de uma Bomba ou da Bandeira continua acessível (elas não se movem nem sofrem a Maré).
 */
export function effectiveBlocked(state: GameState): ReadonlySet<string> {
  const base = state.config.blockedTiles ?? new Set<string>();
  const flooded = floodedTiles(state);
  if (flooded.size === 0) return base;
  const out = new Set<string>(base);
  const immuneCells = new Set(state.pieces.filter((p) => p.isAlive && isImmune(p)).map((p) => `${p.currentRow}-${p.currentColumn}`));
  flooded.forEach((k) => {
    if (!immuneCells.has(k)) out.add(k);
  });
  return out;
}

/** Elimina as peças móveis que estão em casas inundadas. Devolve as peças e quantas caíram. */
export function applyTide(state: GameState): { pieces: Piece[]; lost: number } {
  const flooded = floodedTiles(state);
  if (flooded.size === 0) return { pieces: state.pieces, lost: 0 };
  let lost = 0;
  const pieces = state.pieces.map((p) => {
    if (p.isAlive && !isImmune(p) && flooded.has(`${p.currentRow}-${p.currentColumn}`)) {
      lost++;
      return { ...p, isAlive: false };
    }
    return p;
  });
  return { pieces, lost };
}

// ───────────────────────── Pontos ─────────────────────────

export const FLAG_POINTS = 10;
const BOMB_VALUE = 4;

export function pieceValue(p: Piece): number {
  if (p.pieceType === "bomb") return BOMB_VALUE;
  if (p.pieceType === "flag") return 0;
  return PIECES[p.pieceType]?.patente ?? 0;
}

export interface Score {
  captured: number; // valor das peças inimigas capturadas
  alive: number; // peças próprias ainda vivas
  flag: number; // Bandeira ainda viva
  total: number;
}

export function scoreOf(state: GameState, owner: PlayerOwner): Score {
  const enemy = owner === "blue" ? "red" : "blue";
  const captured = state.pieces.filter((p) => p.owner === enemy && !p.isAlive).reduce((a, p) => a + pieceValue(p), 0);
  const own = state.pieces.filter((p) => p.owner === owner && p.isAlive);
  const alive = own.length;
  const flag = own.some((p) => p.pieceType === "flag") ? FLAG_POINTS : 0;
  return { captured, alive, flag, total: captured + alive + flag };
}

/** Vencedor por pontos. Desempate: maior valor capturado, mais peças vivas e, por fim, o Vermelho. */
export function winnerByPoints(state: GameState): { winner: Player; blue: Score; red: Score } {
  const blue = scoreOf(state, "blue");
  const red = scoreOf(state, "red");
  let winner: Player;
  if (blue.total !== red.total) winner = blue.total > red.total ? "BLUE" : "RED";
  else if (blue.captured !== red.captured) winner = blue.captured > red.captured ? "BLUE" : "RED";
  else if (blue.alive !== red.alive) winner = blue.alive > red.alive ? "BLUE" : "RED";
  else winner = "RED";
  return { winner, blue, red };
}
