import { PIECES } from "@/config/pieces";
import { PieceManager } from "@/services/pieceManager";
import type { Piece, PieceId } from "@/types/piece";
import type { BoardBounds, Coord, Move, MoveResult } from "@/types/movement";

/**
 * MovementEngine — pure, stateless rules service.
 *
 * Responsibilities (SRP):
 *   - Generate legal destination tiles for a piece
 *   - Validate a proposed move
 *   - Execute a move (returns a new pieces array + Move record)
 *   - Cancel a pending move (returns null selection)
 *
 * Rules (Documento 04 §8, §9, §11):
 *   - Most pieces step exactly one tile to any of the 6 hexagonal
 *     neighbors — never 4 (grid ortogonal) nem 8 (grid com diagonais).
 *   - The Explorador (scout) moves any number of tiles in a single
 *     straight hexagonal direction, stopping the instant it reaches
 *     the board edge, a blocked/terrain tile, a friendly piece
 *     (blocked), or an enemy piece (attack target) — never curving,
 *     never re-pathing, never dodging obstacles.
 *   - No diagonal (square-grid) movement for any piece.
 *   - A piece may never land on a tile occupied by its own team, and
 *     may never move through another piece — both are enforced here
 *     so the Motor remains the sole authority on legality (doc 07).
 *   - Terrain obstacles (Sprint 2.5: forest/water/mountain) behave like
 *     a wall — a blocked coordinate can never be entered nor crossed.
 *     The Engine only ever sees a plain `blockedTiles` coordinate set;
 *     it has no notion of "forest" or any concrete map.
 *
 * The engine is pure so it can run identically in:
 *   - the local React app
 *   - a server-authoritative validator (multiplayer — same source file,
 *     imported by `multiplayer-worker/src/GameRoom.ts` via the same
 *     `@/services/gameEngine` alias; there is no separate copy)
 *   - an AI search routine (move generation, via `AIEngine`)
 *
 * Sprint HEX-01 — o tabuleiro (`hexGeometry.ts`) sempre foi hexagonal
 * (layout "odd-r": linhas ímpares desenhadas meio-hex à direita), mas
 * este arquivo ainda calculava vizinhos como grid quadrado (4 direções
 * fixas N/S/E/W, sem paridade de linha) — a causa raiz de peças
 * "fazendo curva" e do Explorador não conseguir andar em algumas
 * direções hexagonais. Corrigido para a tabela de vizinhança
 * hexagonal padrão (odd-r offset), usada tanto pra 1 passo quanto pra
 * linha reta do Explorador.
 */

/**
 * As 6 direções hexagonais, como deltas (dr, dc) em coordenadas offset
 * "odd-r" — o delta de uma MESMA direção muda conforme a paridade da
 * linha atual (padrão de referência: redblobgames.com/grids/hexagons,
 * "odd-r offset"). Índice fixo por direção: 0=W, 1=E, 2=NW, 3=NE,
 * 4=SW, 5=SE — a ordem não importa pra legalidade, só precisa ser
 * consistente entre um passo e o próximo ao andar em linha reta.
 */
const HEX_NEIGHBOR_DELTAS: Readonly<
  Record<0 | 1, ReadonlyArray<readonly [number, number]>>
> = {
  // Linha par (row % 2 === 0) — não deslocada no desenho.
  0: [
    [0, -1], // W
    [0, 1], // E
    [-1, -1], // NW
    [-1, 0], // NE
    [1, -1], // SW
    [1, 0], // SE
  ],
  // Linha ímpar (row % 2 === 1) — deslocada meio-hex à direita no desenho.
  1: [
    [0, -1], // W
    [0, 1], // E
    [-1, 0], // NW
    [-1, 1], // NE
    [1, 0], // SW
    [1, 1], // SE
  ],
};

/** O vizinho hexagonal de (row, column) na direção `dir` (0–5). Única fonte de adjacência do Motor. */
function hexNeighbor(row: number, column: number, dir: number): Coord {
  const parity = (row & 1) as 0 | 1;
  const [dr, dc] = HEX_NEIGHBOR_DELTAS[parity][dir];
  return { row: row + dr, column: column + dc };
}

function inBounds(row: number, col: number, bounds: BoardBounds): boolean {
  return row >= 0 && row < bounds.rows && col >= 0 && col < bounds.cols;
}

function coordKey(c: Coord): string {
  return `${c.row}-${c.column}`;
}

function movesInLine(piece: Piece): boolean {
  return PIECES[piece.pieceType]?.movimentoEmLinha === true;
}

const NO_BLOCKED_TILES: ReadonlySet<string> = new Set();

export const MovementEngine = {
  /** All legal destination tiles for a given piece under the official rules. */
  getLegalMoves(
    piece: Piece | null | undefined,
    pieces: Piece[],
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): Coord[] {
    if (!piece || !piece.isAlive || !piece.canMove) return [];
    const lineMover = movesInLine(piece);
    const out: Coord[] = [];

    // Sprint HEX-01 — 6 direções hexagonais, nunca 4. Pra manter uma
    // linha reta em coordenadas offset, o delta de CADA passo é
    // recalculado a partir da paridade da linha ATUAL (não acumulado
    // como em grid quadrado) — é assim que se anda reto em hexágono
    // sem desviar quando a linha muda de par pra ímpar ou vice-versa.
    for (let dir = 0; dir < 6; dir++) {
      let row = piece.currentRow;
      let column = piece.currentColumn;

      while (true) {
        const next = hexNeighbor(row, column, dir);
        if (!inBounds(next.row, next.column, bounds)) break;
        if (blockedTiles.has(coordKey(next))) break;

        const occupant = PieceManager.findAt(pieces, next.row, next.column);
        if (occupant) {
          // Cannot cross any piece. An enemy on this tile is a legal
          // attack destination; a friendly piece blocks entirely.
          if (occupant.owner !== piece.owner) out.push(next);
          break;
        }
        out.push(next);
        if (!lineMover) break;
        row = next.row;
        column = next.column;
      }
    }

    return out;
  },

  /** Quick set-based lookup helper for highlight rendering. */
  legalMoveSet(
    piece: Piece | null | undefined,
    pieces: Piece[],
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): Set<string> {
    return new Set(
      MovementEngine.getLegalMoves(piece, pieces, bounds, blockedTiles).map(coordKey),
    );
  },

  /** True iff `target` is a legal destination for `piece`. */
  isLegalMove(
    piece: Piece | null | undefined,
    pieces: Piece[],
    target: Coord,
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): boolean {
    if (!piece) return false;
    return MovementEngine.getLegalMoves(piece, pieces, bounds, blockedTiles).some(
      (c) => c.row === target.row && c.column === target.column,
    );
  },

  /**
   * Execute a move. Pure: returns a new pieces array.
   * Throws if the move is not legal — callers should pre-validate.
   */
  execute(
    pieces: Piece[],
    pieceId: PieceId,
    target: Coord,
    bounds: BoardBounds,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): MoveResult {
    const piece = PieceManager.findById(pieces, pieceId);
    if (!piece) throw new Error(`MovementEngine: unknown piece ${pieceId}`);
    if (!MovementEngine.isLegalMove(piece, pieces, target, bounds, blockedTiles)) {
      throw new Error(
        `MovementEngine: illegal move ${pieceId} -> ${target.row},${target.column}`,
      );
    }
    const from: Coord = { row: piece.currentRow, column: piece.currentColumn };
    const next = PieceManager.move(pieces, pieceId, target.row, target.column);
    const move: Move = { pieceId, from, to: target };
    return { pieces: next, move };
  },

  /** No-op cancel helper — kept for API symmetry and future pending-move flows. */
  cancel(): null {
    return null;
  },
};

export type MovementEngineType = typeof MovementEngine;
