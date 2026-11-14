// Aprendizado da IA com os jogadores (docs/09-IA.md, versão 1.3). Puro: sem rede, sem React, sem dados pessoais.
// Guarda, por modo, só números agregados: onde os jogadores colocam cada tipo de peça no posicionamento
// (profundidade a partir do fundo do seu lado e faixa de linhas) e os posicionamentos completos das partidas que ganharam.

import type { Piece, PieceType, PlayerOwner } from "@/types/piece";

export const ROW_BANDS = 3;
export const MAX_DEPTH = 5;
export const MAX_LAYOUTS = 40;

/** Uma peça de um posicionamento guardado: tipo, profundidade (0 = fundo do lado) e linha. */
export type LayoutEntry = [type: PieceType, depth: number, row: number];

export interface LearningData {
  /** Quantas partidas entre jogadores já foram contadas. */
  games: number;
  /** Por tipo: contagens por (profundidade × faixa de linhas), em fila: índice = depth * ROW_BANDS + banda. */
  cells: Partial<Record<PieceType, number[]>>;
  /** Posicionamentos completos de quem venceu (os mais novos no fim). */
  layouts: LayoutEntry[][];
}

export function emptyLearning(): LearningData {
  return { games: 0, cells: {}, layouts: [] };
}

/** Profundidade de uma coluna a partir do fundo do lado do dono (azul: coluna 0; vermelho: última). */
export function depthOf(col: number, cols: number, owner: PlayerOwner): number {
  return owner === "blue" ? col : cols - 1 - col;
}

export function bandOf(row: number, rows: number): number {
  return Math.max(0, Math.min(ROW_BANDS - 1, Math.floor((row * ROW_BANDS) / Math.max(1, rows))));
}

/**
 * Soma um posicionamento de um jogador ao aprendizado. `won` guarda o posicionamento completo (só os de quem ganhou).
 * Devolve um objeto novo; o original não muda.
 */
export function recordDeployment(data: LearningData, pieces: Piece[], rows: number, cols: number, owner: PlayerOwner, won: boolean): LearningData {
  const cells: LearningData["cells"] = {};
  for (const [t, arr] of Object.entries(data.cells)) cells[t as PieceType] = [...(arr as number[])];
  const layout: LayoutEntry[] = [];
  for (const p of pieces) {
    if (p.owner !== owner || p.currentRow < 0) continue;
    const d = depthOf(p.currentColumn, cols, owner);
    if (d < 0 || d >= MAX_DEPTH) continue;
    const arr = (cells[p.pieceType] ??= new Array(MAX_DEPTH * ROW_BANDS).fill(0));
    arr[d * ROW_BANDS + bandOf(p.currentRow, rows)]++;
    layout.push([p.pieceType, d, p.currentRow]);
  }
  const layouts = won && layout.length > 0 ? [...data.layouts, layout].slice(-MAX_LAYOUTS) : data.layouts;
  return { games: data.games + 1, cells, layouts };
}

/**
 * Quanto os jogadores gostam de cada tipo numa casa, em relação à média (1 = igual à média). Com poucas partidas o
 * peso é pequeno (encolhe para 1). Usado para ajustar a chance de uma peça oculta parada ser de cada tipo.
 */
export function typeLift(data: LearningData | null | undefined, depth: number, row: number, rows: number): Partial<Record<PieceType, number>> {
  const out: Partial<Record<PieceType, number>> = {};
  if (!data || data.games < 3 || depth < 0 || depth >= MAX_DEPTH) return out;
  const idx = depth * ROW_BANDS + bandOf(row, rows);
  let cellTotal = 0;
  let grandTotal = 0;
  const totals: Partial<Record<PieceType, number>> = {};
  for (const [t, arr] of Object.entries(data.cells)) {
    const a = arr as number[];
    const sum = a.reduce((x, y) => x + y, 0);
    totals[t as PieceType] = sum;
    grandTotal += sum;
    cellTotal += a[idx] ?? 0;
  }
  if (cellTotal <= 0 || grandTotal <= 0) return out;
  const trust = data.games / (data.games + 60); // com poucos dados, confia pouco
  for (const [t, arr] of Object.entries(data.cells)) {
    const share = ((arr as number[])[idx] ?? 0) / cellTotal; // fatia do tipo nesta casa
    const overall = (totals[t as PieceType] ?? 0) / grandTotal; // fatia do tipo no exército todo
    if (overall <= 0) continue;
    const ratio = Math.max(0.25, Math.min(4, (share + 0.01) / (overall + 0.01)));
    out[t as PieceType] = 1 - trust + trust * ratio;
  }
  return out;
}

/** Um posicionamento vencedor aleatório, ou null se ainda há poucos. */
export function pickLayout(data: LearningData | null | undefined, rand: () => number = Math.random): LayoutEntry[] | null {
  if (!data || data.layouts.length < 3) return null;
  return data.layouts[Math.floor(rand() * data.layouts.length)] ?? null;
}

/** Confere (e saneia) um aprendizado vindo de fora (armazenamento ou rede): formatos e tamanhos válidos. */
export function sanitizeLearning(raw: unknown): LearningData {
  const out = emptyLearning();
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Partial<LearningData>;
  out.games = Number.isFinite(r.games) ? Math.max(0, Math.floor(r.games as number)) : 0;
  for (const [t, arr] of Object.entries(r.cells ?? {})) {
    if (Array.isArray(arr) && arr.length === MAX_DEPTH * ROW_BANDS && arr.every((n) => Number.isFinite(n) && n >= 0)) {
      out.cells[t as PieceType] = arr.map((n) => Math.floor(n));
    }
  }
  if (Array.isArray(r.layouts)) {
    out.layouts = r.layouts
      .filter((l) => Array.isArray(l) && l.length > 0 && l.length <= 60 && l.every((e) => Array.isArray(e) && typeof e[0] === "string" && Number.isInteger(e[1]) && Number.isInteger(e[2])))
      .slice(-MAX_LAYOUTS) as LayoutEntry[][];
  }
  return out;
}
