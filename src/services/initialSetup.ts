import { PIECES } from "@/config/pieces";
import { PieceManager } from "@/services/pieceManager";
import { BATTLE_FORMATS, type BattleFormat } from "@/services/battleFormat";
import type { Piece, PieceType, PlayerOwner } from "@/types/piece";

/**
 * Deployment template — 4 columns deep x 10 rows per side. Only the
 * piece TYPE is declared here; rank and mobility are derived from
 * `PIECES` (the single official source of truth — Documento 06) so
 * this grid can never drift out of sync with the rest of the app.
 *
 * Counts match Documento 06 exactly: 1 Comandante, 2 Oficiais,
 * 3 Franco-atiradores, 12 Infantarias, 8 Engenheiros, 6 Exploradores,
 * 1 Espião, 6 Bombas, 1 Bandeira = 40 peças.
 *
 * Sprint 2.5: teams now face each other left/right instead of
 * top/bottom, so the outer index is DEPTH (columns from the player's
 * home edge, 0 = back rank) and the inner index is POSITION along the
 * shared vertical edge (row). The array content is unchanged from
 * Sprint 2 — only how it's read changed.
 */
const DEPLOYMENT: PieceType[][] = [
  // Back rank (depth 0) — command + objective
  ["bomb", "officer", "bomb", "commander", "flag", "bomb", "officer", "bomb", "bomb", "bomb"],
  // Mid-back (depth 1) — specialists
  ["engineer", "engineer", "engineer", "spy", "engineer", "engineer", "sniper", "engineer", "engineer", "engineer"],
  // Mid-front (depth 2) — infantry line
  ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry"],
  // Front rank (depth 3) — scouts + remaining snipers/infantry
  ["scout", "scout", "sniper", "infantry", "scout", "scout", "infantry", "sniper", "scout", "scout"],
];

/**
 * Sprint POS-01 — linhas (0-indexed) puladas por cada coluna de
 * profundidade ao espalhar as 10 peças do `DEPLOYMENT` pelas 12 linhas
 * do tabuleiro ativo. Antes, `pos` (0-9) era usado direto como `row`,
 * deixando as duas últimas linhas (10-11) sempre vazias na parte
 * inferior do tabuleiro. Cada coluna agora pula 2 linhas DIFERENTES
 * (nunca as mesmas duas em todas as colunas), então nenhuma linha
 * inteira fica vazia — só peças isoladas ficam de fora, espalhadas,
 * preenchendo visualmente toda a zona de posicionamento. Só a
 * distribuição visual muda; contagem de peças, tipos e regras
 * permanecem exatamente as mesmas.
 */
const DEPTH_SKIP_ROWS: number[][] = [
  [2, 9],
  [4, 11],
  [0, 7],
  [5, 10],
];

/**
 * Mapeia os 10 itens de uma coluna de profundidade para linhas
 * 0..totalRows-1, pulando `skipRows`. Se `totalRows` for pequeno demais
 * pro pulo valer a pena (mapas menores que os 12 linhas padrão), volta
 * a preencher sequencialmente sem pular nada — nunca perde peças.
 */
function rowsForDepth(totalRows: number, skipRows: number[]): number[] {
  const skip = new Set(skipRows);
  const rows: number[] = [];
  for (let r = 0; r < totalRows && rows.length < 10; r++) {
    if (!skip.has(r)) rows.push(r);
  }
  for (let r = 0; r < totalRows && rows.length < 10; r++) {
    if (!rows.includes(r)) rows.push(r);
  }
  return rows;
}

export interface InitialSetupOptions {
  rows?: number;
  cols?: number;
  /** Formato do ritmo (docs/04-Regras.md, seção 19). Ausente ou Clássica: o posicionamento oficial de 40 peças. */
  format?: BattleFormat;
}

/** Ordem em que um exército menor é posicionado: o que protege e vale mais fica atrás, a linha de frente por último. */
const ORDER: PieceType[] = ["flag", "commander", "officer", "bomb", "spy", "engineer", "sniper", "infantry", "scout"];

/**
 * Posicionamento padrão de um exército menor: preenche as colunas da zona (de trás para a frente) com a
 * composição do formato. Cada coluna tem uma peça por linha do tabuleiro.
 */
function layoutFromRoster(format: BattleFormat): PieceType[][] {
  const queue: PieceType[] = [];
  for (const t of ORDER) for (let i = 0; i < (format.roster[t] ?? 0); i++) queue.push(t);
  const layout: PieceType[][] = [];
  for (let d = 0; d < format.depth; d++) layout.push(queue.slice(d * format.rows, (d + 1) * format.rows));
  return layout;
}

/**
 * Generates every piece for both players. Performs NO legality checks
 * — that's the rules service's job. Azul deploys on the left edge,
 * Vermelho mirrors on the right edge (Sprint 2.5 orientation).
 */
export const InitialSetup = {
  generate({ rows = 10, cols = 10, format }: InitialSetupOptions = {}): Piece[] {
    const custom = !!format && format !== BATTLE_FORMATS.classic;
    const layout = custom ? layoutFromRoster(format) : DEPLOYMENT;
    const pieces: Piece[] = [];
    const counters = new Map<string, number>();
    const nextIndex = (owner: PlayerOwner, type: PieceType) => {
      const key = `${owner}:${type}`;
      const i = (counters.get(key) ?? 0) + 1;
      counters.set(key, i);
      return i;
    };

    for (let depth = 0; depth < layout.length; depth++) {
      const depthRows = custom ? Array.from({ length: rows }, (_, r) => r) : rowsForDepth(rows, DEPTH_SKIP_ROWS[depth] ?? []);
      for (let pos = 0; pos < Math.min(depthRows.length, layout[depth].length); pos++) {
        const type = layout[depth][pos];
        const info = PIECES[type];
        const rank = info?.patente ?? 0;
        const canMove = info?.podeMover ?? true;
        const row = depthRows[pos];

        // Blue — left edge, columns [0 .. 3].
        pieces.push(
          PieceManager.create({
            owner: "blue",
            pieceType: type,
            rank,
            row,
            column: depth,
            index: nextIndex("blue", type),
            canMove,
            isRevealed: false, // fog of war — owner visibility resolved by FogOfWarEngine
          }),
        );

        // Red — right edge, mirrored across the vertical center line.
        pieces.push(
          PieceManager.create({
            owner: "red",
            pieceType: type,
            rank,
            row,
            column: cols - 1 - depth,
            index: nextIndex("red", type),
            canMove,
            isRevealed: false,
          }),
        );
      }
    }

    return pieces;
  },
};
