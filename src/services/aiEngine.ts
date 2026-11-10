import { PIECES } from "@/config/pieces";
import { formatFor } from "@/services/battleFormat";
import { MovementEngine } from "@/services/movementEngine";
import { PieceManager } from "@/services/pieceManager";
import type { GameState, Player } from "@/types/gameState";
import { playerToOwner } from "@/types/gameState";
import type { Coord } from "@/types/movement";
import type { Piece, PieceType, PlayerOwner } from "@/types/piece";

/**
 * AIEngine — escolhe a jogada do computador. Função pura em relação ao jogo: nunca altera o estado;
 * quem executa é o `useAITurn`, pelas mesmas intenções (selecionar + mover) de um jogador humano.
 *
 * v0.2 — joga com a mesma informação de um jogador humano (docs/04-Regras.md, seção 7):
 *   - conhece as próprias peças, as peças inimigas já reveladas e a Bandeira inimiga (sempre visível);
 *   - das demais, só sabe o que a partida mostrou: quais tipos já saíram (combates) e quais peças
 *     se moveram (uma peça que andou não é Bomba). Nunca lê tipo, patente ou mobilidade de peça oculta.
 *
 * Como decide: dá uma nota a cada jogada legal e escolhe a melhor.
 *   - Ataque a peça revelada: resultado exato (ganha, perde ou troca).
 *   - Ataque a peça oculta: valor esperado, pela chance de cada tipo ainda em campo; só compensa com
 *     peças baratas (testar com Batedor/Infantaria) ou quando o risco é baixo.
 *   - Casa vazia: avança rumo à Bandeira inimiga (o Engenheiro, único que desarma Bomba, com mais
 *     pressa), foge de peças que a venceriam e evita ficar indo e voltando.
 *   - Bandeira ao alcance: sempre captura.
 */

export interface AIDecision {
  piece: Piece;
  target: Coord;
}

interface ScoredMove {
  piece: Piece;
  target: Coord;
  score: number;
}

/** Quanto cada tipo "vale" para a IA. A Bandeira encerra a partida. */
const VALUE: Record<PieceType, number> = {
  commander: 12,
  officer: 8,
  sniper: 6,
  engineer: 5,
  infantry: 4,
  spy: 5,
  scout: 2,
  bomb: 3,
  flag: 1000,
};

/** Quanto a IA se arrisca a levar a peça adiante em campo (menos para as valiosas). */
const ADVANCE: Record<PieceType, number> = {
  commander: 0.35,
  officer: 0.6,
  sniper: 0.8,
  engineer: 0.9,
  infantry: 1,
  spy: 0.35,
  scout: 1.1,
  bomb: 0,
  flag: 0,
};

const LOSS_AVERSION = 1.1; // perder uma peça dói um pouco mais do que ganhar a mesma vale
const INFO_BONUS = 1.8; // descobrir quem é uma peça oculta tem valor (e empurra a IA para o combate)
const FLAG_BONUS = 10_000;

// ───────────────────────── Memória da partida ─────────────────────────
// Só guarda o que um jogador humano veria: onde as peças estavam e o que já foi revelado em combate.

interface Memory {
  turn: number;
  prevPos: Map<string, string>;
  moved: Set<string>;
  seenCombat: Set<number>;
  deadEnemy: Partial<Record<PieceType, number>>;
  lastFrom: Map<string, string>;
}

function fresh(): Memory {
  return { turn: 0, prevPos: new Map(), moved: new Set(), seenCombat: new Set(), deadEnemy: {}, lastFrom: new Map() };
}

// Uma memória por lado, para duas IAs na mesma página (ou nos testes) não se misturarem.
const memories: Record<PlayerOwner, Memory> = { blue: fresh(), red: fresh() };
let memory: Memory = memories.blue;

function observe(state: GameState, owner: PlayerOwner): void {
  if (state.turnNumber < memories[owner].turn) memories[owner] = fresh(); // partida nova
  memory = memories[owner];
  memory.turn = state.turnNumber;
  for (const p of state.pieces) {
    if (!p.isAlive) continue;
    const here = `${p.currentRow}-${p.currentColumn}`;
    const before = memory.prevPos.get(p.id);
    if (before !== undefined && before !== here) {
      if (p.owner === owner) memory.lastFrom.set(p.id, before); // minha peça: de onde veio
      else memory.moved.add(p.id); // peça inimiga que andou: não é Bomba
    }
    memory.prevPos.set(p.id, here);
  }
  const c = state.lastCombat;
  if (c && !memory.seenCombat.has(c.id)) {
    memory.seenCombat.add(c.id);
    for (const snap of [c.attackerSnapshot, c.defenderSnapshot]) {
      if (snap.owner !== owner && c.removedIds.includes(snap.id)) {
        memory.deadEnemy[snap.pieceType] = (memory.deadEnemy[snap.pieceType] ?? 0) + 1;
      }
    }
  }
}

// ───────────────────────── Hexágonos ─────────────────────────

/** Distância hexagonal entre duas casas (layout "odd-r", o mesmo do Motor). */
function hexDistance(r1: number, c1: number, r2: number, c2: number): number {
  const x1 = c1 - (r1 - (r1 & 1)) / 2;
  const x2 = c2 - (r2 - (r2 & 1)) / 2;
  const dx = x1 - x2;
  const dz = r1 - r2;
  const dy = -dx - dz;
  return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
}

// ───────────────────────── Combate ─────────────────────────

/** Mesma regra do CombatEngine, sobre tipos. 1 = atacante vence, 0 = os dois morrem, -1 = defensor vence. */
function fight(att: PieceType, def: PieceType): 1 | 0 | -1 {
  if (att === "spy" && def === "commander") return 1;
  if (def === "bomb") return att === "engineer" ? 1 : -1;
  const a = PIECES[att]?.patente ?? 0;
  const d = PIECES[def]?.patente ?? 0;
  return a > d ? 1 : a < d ? -1 : 0;
}

/** Resultado esperado, em pontos da IA, de `att` atacar `def`. */
function payoff(att: PieceType, def: PieceType): number {
  const r = fight(att, def);
  if (r === 1) return VALUE[def];
  if (r === -1) return -VALUE[att] * LOSS_AVERSION;
  return VALUE[def] - VALUE[att] * LOSS_AVERSION * 0.8;
}

type Belief = { type: PieceType; w: number }[];

/** O que a IA acha que uma peça inimiga oculta pode ser, a partir do que ainda não saiu de campo. */
function buildBelief(state: GameState, owner: PlayerOwner): { any: Belief; moved: Belief } {
  const enemy = owner === "blue" ? "red" : "blue";
  const shownAlive: Partial<Record<PieceType, number>> = {};
  for (const p of state.pieces) {
    if (p.owner === enemy && p.isAlive && p.isRevealed) shownAlive[p.pieceType] = (shownAlive[p.pieceType] ?? 0) + 1;
  }
  const any: Belief = [];
  const moved: Belief = [];
  for (const t of Object.keys(PIECES) as PieceType[]) {
    if (t === "flag") continue; // a Bandeira é sempre visível, então uma peça oculta nunca é ela
    const left = formatFor(state.config.pace).roster[t] - (shownAlive[t] ?? 0) - (memory.deadEnemy[t] ?? 0);
    if (left <= 0) continue;
    any.push({ type: t, w: left });
    if (t !== "bomb") moved.push({ type: t, w: left });
  }
  return { any, moved };
}

const sumW = (b: Belief) => b.reduce((a, x) => a + x.w, 0);

function expectedAttack(att: PieceType, belief: Belief): number {
  const total = sumW(belief);
  if (total <= 0) return 0;
  return belief.reduce((a, x) => a + (x.w / total) * payoff(att, x.type), 0);
}

// ───────────────────────── Perigo ─────────────────────────

/** Risco, em pontos, de deixar `me` na casa (row, col): peças inimigas vizinhas que a venceriam. */
function danger(me: Piece, row: number, col: number, pieces: Piece[], enemy: PlayerOwner, belief: { any: Belief; moved: Belief }): number {
  let risk = 0;
  for (const e of pieces) {
    if (!e.isAlive || e.owner !== enemy) continue;
    if (hexDistance(e.currentRow, e.currentColumn, row, col) !== 1) continue;
    if (e.isRevealed) {
      if (e.pieceType === "bomb" || e.pieceType === "flag") continue;
      const r = fight(e.pieceType, me.pieceType);
      // O adversário não sabe quem eu sou se eu estiver oculta; ataca menos.
      const attacks = me.isRevealed ? 0.9 : 0.5;
      if (r === 1) risk += VALUE[me.pieceType] * attacks;
      else if (r === 0) risk += VALUE[me.pieceType] * 0.4 * attacks;
    } else {
      const b = memory.moved.has(e.id) ? belief.moved : belief.any;
      const total = sumW(b);
      if (total <= 0) continue;
      let p = 0;
      for (const x of b) {
        if (x.type === "bomb") continue;
        const r = fight(x.type, me.pieceType);
        if (r === 1) p += x.w / total;
        else if (r === 0) p += (x.w / total) * 0.4;
      }
      risk += VALUE[me.pieceType] * p * 0.3;
    }
  }
  return risk;
}

// ───────────────────────── Escolha ─────────────────────────

export const AIEngine = {
  /**
   * Escolhe uma jogada para o jogador. Devolve null quando não há jogada legal
   * (todas as peças presas): quem chama deve passar a vez.
   */
  chooseMove(state: GameState, player: Player): AIDecision | null {
    const owner = playerToOwner(player);
    const enemy: PlayerOwner = owner === "blue" ? "red" : "blue";
    observe(state, owner);

    const own = PieceManager.byOwner(state.pieces, owner).filter((p) => p.canMove);
    if (own.length === 0) return null;

    const bounds = { rows: state.config.rows, cols: state.config.cols };
    const blocked = state.config.blockedTiles ?? new Set<string>();
    const belief = buildBelief(state, owner);
    const enemyFlag = state.pieces.find((p) => p.isAlive && p.owner === enemy && p.pieceType === "flag");
    const myFlag = state.pieces.find((p) => p.isAlive && p.owner === owner && p.pieceType === "flag");
    const midRow = (bounds.rows - 1) / 2;
    const midCol = (bounds.cols - 1) / 2;

    // Ameaças perto da minha Bandeira: peças inimigas que já mostraram ser móveis, ou que andaram.
    const threats = myFlag
      ? state.pieces.filter(
          (p) => p.isAlive && p.owner === enemy && hexDistance(p.currentRow, p.currentColumn, myFlag.currentRow, myFlag.currentColumn) <= 3 && (p.isRevealed ? PIECES[p.pieceType]?.podeMover : memory.moved.has(p.id)),
        )
      : [];

    const candidates: ScoredMove[] = [];

    for (const piece of own) {
      const moves = MovementEngine.getLegalMoves(piece, state.pieces, bounds, blocked);
      const dangerNow = danger(piece, piece.currentRow, piece.currentColumn, state.pieces, enemy, belief);
      const adv = ADVANCE[piece.pieceType] ?? 1;

      for (const target of moves) {
        const occupant = PieceManager.findAt(state.pieces, target.row, target.column);
        if (occupant && occupant.owner === owner) continue;

        let score = 0;

        if (occupant) {
          // ── Ataque ──
          if (occupant.pieceType === "flag") {
            score = FLAG_BONUS;
          } else if (occupant.isRevealed) {
            score = payoff(piece.pieceType, occupant.pieceType);
          } else {
            const b = memory.moved.has(occupant.id) ? belief.moved : belief.any;
            score = expectedAttack(piece.pieceType, b) + INFO_BONUS * (piece.pieceType === "scout" ? 2 : 1);
          }
          // Tirar uma ameaça de perto da minha Bandeira vale um pouco mais.
          if (threats.some((t) => t.id === occupant.id)) score += 2;
        } else {
          // ── Casa vazia ──
          // Rumo à Bandeira inimiga (ou ao centro, se ela sumiu); o Engenheiro tem mais pressa.
          const goalRow = enemyFlag ? enemyFlag.currentRow : midRow;
          const goalCol = enemyFlag ? enemyFlag.currentColumn : midCol;
          const closer =
            hexDistance(piece.currentRow, piece.currentColumn, goalRow, goalCol) - hexDistance(target.row, target.column, goalRow, goalCol);
          const pull = piece.pieceType === "engineer" ? 2.4 : 1;
          score += closer * pull * adv;

          // Só os batedores andam longe: mover mais de uma casa revela o Batedor.
          if (piece.pieceType === "scout") {
            const steps = hexDistance(piece.currentRow, piece.currentColumn, target.row, target.column);
            if (steps > 1) score -= 1.2 * steps;
          }

          // Não ficar indo e voltando.
          if (memory.lastFrom.get(piece.id) === `${target.row}-${target.column}`) score -= 3;

          // Fugir de quem me vence e evitar entrar em perigo.
          const dangerThere = danger(piece, target.row, target.column, state.pieces, enemy, belief);
          score -= (dangerThere - dangerNow) * 1.0;
          score -= dangerThere * 0.3;

          // Proteger a Bandeira: peças fortes perto dela quando há ameaça.
          if (myFlag && threats.length > 0) {
            const toFlag = hexDistance(target.row, target.column, myFlag.currentRow, myFlag.currentColumn);
            const fromFlag = hexDistance(piece.currentRow, piece.currentColumn, myFlag.currentRow, myFlag.currentColumn);
            if (toFlag < fromFlag && (PIECES[piece.pieceType]?.patente ?? 0) >= 4) score += 1.5;
          }
        }

        // Um desempate leve e aleatório deixa a IA menos previsível.
        score += Math.random() * 0.4;
        candidates.push({ piece, target, score });
      }
    }

    if (candidates.length === 0) return null;

    let best = candidates[0];
    for (const c of candidates) if (c.score > best.score) best = c;
    return { piece: best.piece, target: best.target };
  },
};

export type AIEngineType = typeof AIEngine;
