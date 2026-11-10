import { PIECES } from "@/config/pieces";
import type { Pace } from "@/types/gameState";
import type { PieceType } from "@/types/piece";

/**
 * Formato da partida por ritmo (docs/04-Regras.md, seção 19): tamanho do tabuleiro, profundidade da
 * zona de posicionamento e composição do exército. Dados puros, usados pelo Motor e pela Interface.
 * A Partida Intensa (`classic`) é o formato oficial de sempre (40 peças, 12 × 18) e é também o do online.
 */
export interface BattleFormat {
  rows: number;
  cols: number;
  /** Colunas de cada ponta onde o exército se posiciona. */
  depth: number;
  /** Quantidade de cada tipo de peça por exército. */
  roster: Record<PieceType, number>;
}

const TYPES = Object.keys(PIECES) as PieceType[];

const CLASSIC_ROSTER = Object.fromEntries(TYPES.map((t) => [t, PIECES[t].quantidade])) as Record<PieceType, number>;

export const BATTLE_FORMATS: Record<Pace, BattleFormat> = {
  classic: { rows: 12, cols: 18, depth: 4, roster: CLASSIC_ROSTER },
  rapid: {
    rows: 10,
    cols: 14,
    depth: 3,
    roster: { commander: 1, officer: 1, sniper: 2, engineer: 5, infantry: 10, scout: 5, spy: 1, bomb: 4, flag: 1 },
  },
  blitz: {
    rows: 8,
    cols: 12,
    depth: 3,
    roster: { commander: 1, officer: 1, sniper: 2, engineer: 4, infantry: 7, scout: 3, spy: 1, bomb: 4, flag: 1 },
  },
};

/** Formato de um ritmo (a Partida Intensa quando não há modo). */
export function formatFor(pace: Pace | undefined | null): BattleFormat {
  return BATTLE_FORMATS[pace ?? "classic"];
}

/** Aceita só os três modos conhecidos; qualquer outra coisa (ou nada) vira a Partida Intensa. Usado pelo servidor com dado do cliente. */
export function normalizePace(value: unknown): Pace {
  return value === "rapid" || value === "blitz" || value === "classic" ? value : "classic";
}

/** Nome de cada modo para a tela. */
export const PACE_NAMES: Record<Pace, string> = { blitz: "Partida Rápida", rapid: "Partida Normal", classic: "Partida Intensa" };

/** Total de peças por exército. */
export function armySize(format: BattleFormat): number {
  return TYPES.reduce((a, t) => a + format.roster[t], 0);
}
