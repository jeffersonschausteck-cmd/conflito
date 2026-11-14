import { PIECES } from "@/config/pieces";
import { formatFor } from "@/services/battleFormat";
import { distanceField, distanceFieldMulti, hexDistance, hexNeighbors, UNREACHABLE } from "@/services/hexNav";
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
 * v0.3 — joga com a mesma informação de um jogador humano (docs/04-Regras.md, seção 7; docs/09-IA.md):
 *   - conhece as próprias peças, as peças inimigas já reveladas e a Bandeira inimiga (sempre visível);
 *   - das demais, só sabe o que a partida mostrou: quais tipos já saíram (combates) e quais peças
 *     se moveram (uma peça que andou não é Armadilha). Nunca lê tipo, patente ou mobilidade de peça oculta.
 *
 * Como decide: dá uma nota a cada jogada legal e escolhe a melhor.
 *   - Ataque a peça revelada: resultado exato (ganha, perde ou troca).
 *   - Ataque a peça oculta: valor esperado, pela chance de cada tipo ainda em campo.
 *   - Casa vazia: avança rumo à Bandeira inimiga pelo caminho real (contornando rios e montanhas), o Sapador
 *     com mais pressa (único que abre Armadilha), o Assassino rumo ao Rei revelado, e foge de peças que a venceriam.
 *   - Defesa da Bandeira: antes de jogar, mede se alguma peça inimiga (inclusive um Batedor em linha reta) poderia
 *     capturá-la no turno seguinte; jogadas que a deixam exposta perdem muitos pontos e as que fecham a brecha ganham.
 *     Mantém guardas móveis perto dela.
 *   - Bandeira inimiga ao alcance: sempre captura; um Batedor com a linha livre até ela é recompensado.
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
const HAZARD_WEIGHT = 90; // pontos por "chance de perder a Bandeira no próximo turno"
const GUARD_RADIUS = 3; // distância (em casas, pelo terreno) que conta como "perto da Bandeira"

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
      else memory.moved.add(p.id); // peça inimiga que andou: não é Armadilha
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

// ───────────────────────── Combate ─────────────────────────

/** Mesma regra do CombatEngine, sobre tipos. 1 = atacante vence, 0 = os dois morrem, -1 = defensor vence. */
function fight(att: PieceType, def: PieceType): 1 | 0 | -1 {
  // Rei × Assassino: o Rei sempre morre, quem quer que ataque (docs/04-Regras.md, seção 11).
  if (att === "spy" && def === "commander") return 1;
  if (att === "commander" && def === "spy") return -1;
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
interface Beliefs {
  any: Belief;
  moved: Belief;
}

/** O que a IA acha que uma peça inimiga oculta pode ser, a partir do que ainda não saiu de campo. */
function buildBelief(state: GameState, owner: PlayerOwner): Beliefs {
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

/** Chance de cada peça oculta ser Armadilha cresce muito se ela fica colada à Bandeira (onde se guardam Armadilhas). */
function scaleBombs(b: Belief, factor: number): Belief {
  return factor === 1 ? b : b.map((x) => (x.type === "bomb" ? { type: x.type, w: x.w * factor } : x));
}

function expectedAttack(att: PieceType, belief: Belief): number {
  const total = sumW(belief);
  if (total <= 0) return 0;
  return belief.reduce((a, x) => a + (x.w / total) * payoff(att, x.type), 0);
}

/** Chances de vitória, troca e derrota de `att` contra uma peça oculta. */
function outcomeProbs(att: PieceType, belief: Belief): { win: number; trade: number; lose: number } {
  const total = sumW(belief);
  if (total <= 0) return { win: 0, trade: 0, lose: 1 };
  let win = 0;
  let trade = 0;
  for (const x of belief) {
    const r = fight(att, x.type);
    if (r === 1) win += x.w;
    else if (r === 0) trade += x.w;
  }
  return { win: win / total, trade: trade / total, lose: 1 - (win + trade) / total };
}

// ───────────────────────── Perigo ─────────────────────────

/** Risco, em pontos, de deixar `me` na casa (row, col): peças inimigas vizinhas que a venceriam. */
function danger(me: Piece, row: number, col: number, pieces: Piece[], enemy: PlayerOwner, belief: Beliefs): number {
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

// ───────────────────────── Bandeira ─────────────────────────

type At = (key: string) => Piece | undefined;

interface HazardCtx {
  rows: number;
  cols: number;
  blocked: ReadonlySet<string>;
  owner: PlayerOwner;
  flag: Piece;
  scoutAny: number; // chance de uma peça oculta qualquer ser Batedor
  scoutMoved: number; // idem, para uma que já andou
}

/**
 * Chance (0 a 1) de a minha Bandeira ser capturada no próximo turno, olhando as 6 direções a partir dela:
 * a primeira peça que se encontra é inimiga e consegue chegar (vizinha, ou Batedor em linha reta)?
 */
function flagHazard(ctx: HazardCtx, at: At): number {
  let worst = 0;
  for (let dir = 0; dir < 6; dir++) {
    let row = ctx.flag.currentRow;
    let col = ctx.flag.currentColumn;
    for (let steps = 1; ; steps++) {
      const [nr, nc] = hexNeighbors(row, col)[dir];
      if (nr < 0 || nr >= ctx.rows || nc < 0 || nc >= ctx.cols || ctx.blocked.has(`${nr}-${nc}`)) break;
      const occ = at(`${nr}-${nc}`);
      if (!occ) {
        row = nr;
        col = nc;
        continue;
      }
      if (occ.owner === ctx.owner) break;
      let w = 0;
      if (occ.isRevealed) {
        const def = PIECES[occ.pieceType];
        if (def?.podeMover) w = steps === 1 ? 1 : def.movimentoEmLinha ? 1 : 0;
      } else if (steps === 1) {
        w = memory.moved.has(occ.id) ? 1 : 0.85;
      } else {
        w = memory.moved.has(occ.id) ? ctx.scoutMoved : ctx.scoutAny;
      }
      worst = Math.max(worst, w);
      break;
    }
  }
  return worst;
}

/** O Batedor em `from` teria linha reta livre até `flag`? (sem nenhuma peça no caminho) */
function clearLine(from: Coord, flag: Piece, rows: number, cols: number, blocked: ReadonlySet<string>, at: At): boolean {
  for (let dir = 0; dir < 6; dir++) {
    let row = from.row;
    let col = from.column;
    while (true) {
      const [nr, nc] = hexNeighbors(row, col)[dir];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || blocked.has(`${nr}-${nc}`)) break;
      if (nr === flag.currentRow && nc === flag.currentColumn) return true;
      if (at(`${nr}-${nc}`)) break;
      row = nr;
      col = nc;
    }
  }
  return false;
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

    const rows = state.config.rows;
    const cols = state.config.cols;
    const bounds = { rows, cols };
    const blocked = state.config.blockedTiles ?? new Set<string>();
    const belief = buildBelief(state, owner);
    const enemyFlag = state.pieces.find((p) => p.isAlive && p.owner === enemy && p.pieceType === "flag");
    const myFlag = state.pieces.find((p) => p.isAlive && p.owner === owner && p.pieceType === "flag");
    const midRow = (rows - 1) / 2;
    const midCol = (cols - 1) / 2;

    // Distâncias pelo terreno até cada Bandeira (rios, montanhas e florestas contam).
    const toEnemyFlag = enemyFlag ? distanceField(enemyFlag.currentRow, enemyFlag.currentColumn, rows, cols, blocked) : null;
    const toMyFlag = myFlag ? distanceField(myFlag.currentRow, myFlag.currentColumn, rows, cols, blocked) : null;
    const walk = (field: Int16Array | null, row: number, col: number, goalRow: number, goalCol: number) => {
      const v = field ? field[row * cols + col] : UNREACHABLE;
      return v === UNREACHABLE ? hexDistance(row, col, goalRow, goalCol) + 2 : v;
    };

    // Quem está onde (para olhar a vizinhança da Bandeira sem refazer buscas).
    const byKey = new Map<string, Piece>();
    for (const p of state.pieces) if (p.isAlive) byKey.set(`${p.currentRow}-${p.currentColumn}`, p);

    // Ameaças à minha Bandeira: peças inimigas que já mostraram ser móveis, ou que andaram, ao alcance de poucos passos.
    const threats = myFlag
      ? state.pieces.filter(
          (p) =>
            p.isAlive &&
            p.owner === enemy &&
            (p.isRevealed ? PIECES[p.pieceType]?.podeMover : memory.moved.has(p.id)) &&
            walk(toMyFlag, p.currentRow, p.currentColumn, myFlag.currentRow, myFlag.currentColumn) <= GUARD_RADIUS + 1,
        )
      : [];

    // Guardas: peças minhas que se movem e estão perto da minha Bandeira.
    const guards = myFlag
      ? own.filter((p) => walk(toMyFlag, p.currentRow, p.currentColumn, myFlag.currentRow, myFlag.currentColumn) <= GUARD_RADIUS)
      : [];
    const guardsWanted = state.config.pace === "blitz" ? 2 : 3;

    const scoutOdds = (b: Belief) => {
      const total = sumW(b);
      return total > 0 ? (b.find((x) => x.type === "scout")?.w ?? 0) / total : 0;
    };
    const hazardCtx: HazardCtx | null = myFlag
      ? { rows, cols, blocked, owner, flag: myFlag, scoutAny: scoutOdds(belief.any), scoutMoved: scoutOdds(belief.moved) }
      : null;
    const hazardNow = hazardCtx ? flagHazard(hazardCtx, (k) => byKey.get(k)) : 0;

    // Caça no fim de jogo: quando o inimigo já tem poucas peças móveis (estimativa pelo que sobrou do elenco,
    // descontadas as Armadilhas), vale vencer por "sem peças móveis". As peças vão atrás das móveis conhecidas.
    const enemyAlive = state.pieces.filter((p) => p.isAlive && p.owner === enemy);
    const bombsLeft = Math.max(0, formatFor(state.config.pace).roster.bomb - (memory.deadEnemy.bomb ?? 0));
    const mobileEstimate = enemyAlive.length - 1 - bombsLeft;
    const huntTargets =
      mobileEstimate <= 4 && own.length >= mobileEstimate
        ? enemyAlive.filter((p) => (p.isRevealed ? PIECES[p.pieceType]?.podeMover : memory.moved.has(p.id)))
        : [];

    // O Assassino persegue o Rei inimigo quando ele já foi revelado.
    const enemyKing = state.pieces.find((p) => p.isAlive && p.owner === enemy && p.pieceType === "commander" && p.isRevealed);

    // Urgência: partida longa sem desfecho faz a IA arriscar mais (menos cautela, mais pressa em atacar),
    // para duas defesas fortes não ficarem rodando para sempre.
    const urgency = Math.max(0, Math.min(1.5, (state.turnNumber - 100) / 160));
    const calm = 1 - 0.6 * Math.min(1, urgency);

    // Caminhos reais até as presas (o Rei revelado, para o Assassino; as peças móveis, para a caça).
    const toKing = enemyKing ? distanceField(enemyKing.currentRow, enemyKing.currentColumn, rows, cols, blocked) : null;
    const toPrey = huntTargets.length > 0 ? distanceFieldMulti(huntTargets.map((t) => [t.currentRow, t.currentColumn] as const), rows, cols, blocked) : null;

    const candidates: ScoredMove[] = [];

    for (const piece of own) {
      const moves = MovementEngine.getLegalMoves(piece, state.pieces, bounds, blocked);
      const dangerNow = danger(piece, piece.currentRow, piece.currentColumn, state.pieces, enemy, belief);
      const adv = ADVANCE[piece.pieceType] ?? 1;
      const fromKey = `${piece.currentRow}-${piece.currentColumn}`;
      const isGuard = guards.some((g) => g.id === piece.id);

      for (const target of moves) {
        const occupant = PieceManager.findAt(state.pieces, target.row, target.column);
        if (occupant && occupant.owner === owner) continue;
        const toKey = `${target.row}-${target.column}`;

        let score = 0;
        // Chances de o atacante sobreviver ao combate (usadas na defesa da Bandeira).
        let probs = { win: 1, trade: 0, lose: 0 };

        if (occupant) {
          // ── Ataque ──
          if (occupant.pieceType === "flag") {
            score = FLAG_BONUS;
          } else if (occupant.isRevealed) {
            score = payoff(piece.pieceType, occupant.pieceType);
            const r = fight(piece.pieceType, occupant.pieceType);
            probs = { win: r === 1 ? 1 : 0, trade: r === 0 ? 1 : 0, lose: r === -1 ? 1 : 0 };
            // Abrir caminho para a Bandeira inimiga: Armadilha revelada colada a ela.
            if (occupant.pieceType === "bomb" && r === 1 && enemyFlag && hexDistance(occupant.currentRow, occupant.currentColumn, enemyFlag.currentRow, enemyFlag.currentColumn) <= 1) score += 4;
          } else {
            const nearFlag = enemyFlag && hexDistance(occupant.currentRow, occupant.currentColumn, enemyFlag.currentRow, enemyFlag.currentColumn) <= 1;
            const unmoved = !memory.moved.has(occupant.id);
            // Peça parada colada à Bandeira inimiga tem muita chance de ser Armadilha.
            const b = unmoved ? scaleBombs(belief.any, nearFlag ? 3 : 1) : belief.moved;
            score = expectedAttack(piece.pieceType, b) + INFO_BONUS * (1 + urgency) * (piece.pieceType === "scout" ? 2 : 1);
            probs = outcomeProbs(piece.pieceType, b);
            // O Sapador que abre o cerco da Bandeira inimiga vale mais.
            if (nearFlag && unmoved && piece.pieceType === "engineer") score += 2.5;
          }
          // Tirar uma ameaça de perto da minha Bandeira vale um pouco mais.
          if (threats.some((t) => t.id === occupant.id)) score += 4;
        } else {
          // ── Casa vazia ──
          // Rumo à Bandeira inimiga pelo caminho real (ou ao centro, se ela sumiu); o Sapador tem mais pressa.
          let goalRow = enemyFlag ? enemyFlag.currentRow : midRow;
          let goalCol = enemyFlag ? enemyFlag.currentColumn : midCol;
          let field = toEnemyFlag;
          if (piece.pieceType === "spy" && enemyKing) {
            // O Assassino vai atrás do Rei revelado, que ele derrota atacando.
            goalRow = enemyKing.currentRow;
            goalCol = enemyKing.currentColumn;
            field = toKing;
          }
          let hunting = false;
          if (toPrey && piece.pieceType !== "spy") {
            // Caça: o alvo é a peça móvel inimiga mais próxima (pelo caminho real).
            const near = huntTargets[0];
            goalRow = near.currentRow;
            goalCol = near.currentColumn;
            field = toPrey;
            hunting = true;
          }
          const closer = walk(field, piece.currentRow, piece.currentColumn, goalRow, goalCol) - walk(field, target.row, target.column, goalRow, goalCol);
          const pull = hunting ? 1.6 : piece.pieceType === "engineer" ? 2.4 : piece.pieceType === "spy" && enemyKing ? 2 : 1;
          score += closer * pull * adv * (1 + urgency * 1.5);

          // Só os batedores andam longe: mover mais de uma casa revela o Batedor.
          if (piece.pieceType === "scout") {
            const steps = hexDistance(piece.currentRow, piece.currentColumn, target.row, target.column);
            if (steps > 1) score -= 1.2 * steps;
            // Linha reta livre até a Bandeira inimiga: no próximo turno ele a captura.
            if (enemyFlag && clearLine(target, enemyFlag, rows, cols, blocked, (k) => (k === fromKey ? undefined : byKey.get(k)))) score += 30;
          }

          // Chegar colado à Bandeira inimiga é o passo antes de capturá-la.
          if (enemyFlag && hexDistance(target.row, target.column, enemyFlag.currentRow, enemyFlag.currentColumn) === 1) score += 3;

          // Não ficar indo e voltando.
          if (memory.lastFrom.get(piece.id) === toKey) score -= 3;

          // Fugir de quem me vence e evitar entrar em perigo.
          const dangerThere = danger(piece, target.row, target.column, state.pieces, enemy, belief);
          score -= ((dangerThere - dangerNow) * 1.0 + dangerThere * 0.3) * calm;

          // Proteger a Bandeira: peças fortes se aproximam dela quando há ameaça por perto.
          if (myFlag && toMyFlag && threats.length > 0) {
            const toFlag = walk(toMyFlag, target.row, target.column, myFlag.currentRow, myFlag.currentColumn);
            const fromFlag = walk(toMyFlag, piece.currentRow, piece.currentColumn, myFlag.currentRow, myFlag.currentColumn);
            if (toFlag < fromFlag && (PIECES[piece.pieceType]?.patente ?? 0) >= 4) score += 2;
          }
        }

        // ── Defesa da Bandeira ──
        if (hazardCtx && myFlag && occupant?.pieceType !== "flag") {
          const moverAt = (k: string, mover: Piece | undefined, occ: Piece | undefined, moverLives: boolean, occLives: boolean): Piece | undefined => {
            if (k === fromKey) return undefined;
            if (k === toKey) return occupant ? (moverLives ? mover : occLives ? occ : undefined) : mover;
            return byKey.get(k);
          };
          const moved = { ...piece, currentRow: target.row, currentColumn: target.column };
          let hazardAfter: number;
          if (!occupant) {
            hazardAfter = flagHazard(hazardCtx, (k) => moverAt(k, moved, undefined, true, false));
          } else {
            hazardAfter =
              probs.win * flagHazard(hazardCtx, (k) => moverAt(k, moved, occupant, true, false)) +
              probs.trade * flagHazard(hazardCtx, (k) => moverAt(k, moved, occupant, false, false)) +
              probs.lose * flagHazard(hazardCtx, (k) => moverAt(k, moved, occupant, false, true));
          }
          score += (hazardNow - hazardAfter) * HAZARD_WEIGHT;

          // Guardas: não esvaziar a vizinhança da Bandeira (só para capturar, que acaba a partida).
          if (isGuard && walk(toMyFlag, target.row, target.column, myFlag.currentRow, myFlag.currentColumn) > GUARD_RADIUS) {
            const left = guards.length - 1;
            if (left < guardsWanted) score -= (guardsWanted - left) * (threats.length > 0 ? 6 : 3.5) * calm;
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
