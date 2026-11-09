// IA nova x IA antiga (a heurística v0.1, copiada aqui como referência). Roda partidas completas sem tela.
// Uso: bun run scripts/test-ai.ts [partidas por lado]
import { GameEngine } from "../src/services/gameEngine";
import { AIEngine, type AIDecision } from "../src/services/aiEngine";
import { MovementEngine } from "../src/services/movementEngine";
import { PieceManager } from "../src/services/pieceManager";
import { effectiveBlocked } from "../src/services/matchRules";
import { ACTIVE_MAP, getBlockedTiles } from "../src/maps";
import type { GameState, Player } from "../src/types/gameState";
import { playerToOwner } from "../src/types/gameState";

/** IA antiga (v0.1): avança por linha, atrai pelo centro e ataca qualquer coisa. */
function legacyChoose(state: GameState, player: Player): AIDecision | null {
  const owner = playerToOwner(player);
  const own = PieceManager.byOwner(state.pieces, owner).filter((p) => p.canMove);
  if (own.length === 0) return null;
  const bounds = { rows: state.config.rows, cols: state.config.cols };
  const cr = (bounds.rows - 1) / 2;
  const cc = (bounds.cols - 1) / 2;
  const forward = player === "BLUE" ? -1 : 1;
  const cands: { piece: (typeof own)[number]; target: { row: number; column: number }; score: number }[] = [];
  for (const piece of own) {
    for (const target of MovementEngine.getLegalMoves(piece, state.pieces, bounds, effectiveBlocked(state))) {
      const occ = PieceManager.findAt(state.pieces, target.row, target.column);
      if (occ && occ.owner === owner) continue;
      let score = 0;
      const rd = target.row - piece.currentRow;
      if (Math.sign(rd) === forward) score += 10;
      else if (rd === 0) score += 2;
      else score -= 4;
      score += (Math.abs(piece.currentRow - cr) + Math.abs(piece.currentColumn - cc) - Math.abs(target.row - cr) - Math.abs(target.column - cc)) * 3;
      if (occ && occ.owner !== owner) score += 6;
      cands.push({ piece, target, score });
    }
  }
  if (cands.length === 0) return null;
  const max = Math.max(...cands.map((c) => c.score));
  const top = cands.filter((c) => c.score === max);
  const pick = top[Math.floor(Math.random() * top.length)];
  return { piece: pick.piece, target: pick.target };
}

type Brain = (s: GameState, p: Player) => AIDecision | null;
const brains: Record<string, Brain> = { nova: (s, p) => AIEngine.chooseMove(s, p), antiga: legacyChoose };

const MAX_PLIES = 700;

function play(blue: string, red: string) {
  let s = GameEngine.createInitialState({ rows: ACTIVE_MAP.rows, cols: ACTIVE_MAP.cols, blockedTiles: getBlockedTiles(ACTIVE_MAP) });
  let plies = 0;
  while (!s.gameOver && plies < MAX_PLIES) {
    const brain = brains[s.currentPlayer === "BLUE" ? blue : red];
    const d = brain(s, s.currentPlayer);
    if (!d) break;
    s = GameEngine.reduce(s, { type: "SELECT_PIECE", pieceId: d.piece.id });
    s = GameEngine.reduce(s, { type: "MOVE_SELECTED", row: d.target.row, column: d.target.column });
    plies++;
  }
  const alive = (o: "blue" | "red") => s.pieces.filter((p) => p.owner === o && p.isAlive).length;
  return { winner: s.winner, plies, blue: alive("blue"), red: alive("red") };
}

const N = Number(process.argv[2] ?? 20);
for (const [a, b] of [["nova", "antiga"], ["antiga", "nova"]] as const) {
  let aWins = 0,
    bWins = 0,
    undecided = 0,
    plies = 0,
    aLeft = 0,
    bLeft = 0;
  for (let i = 0; i < N; i++) {
    const r = play(a, b);
    if (r.winner === "BLUE") aWins++;
    else if (r.winner === "RED") bWins++;
    else undecided++;
    plies += r.plies;
    aLeft += r.blue;
    bLeft += r.red;
  }
  console.log(`Azul=${a} x Vermelho=${b}: Azul ${aWins} · Vermelho ${bWins} · sem fim ${undecided} | jogadas/partida ${Math.round(plies / N)} | peças vivas no fim (azul/vermelho) ${(aLeft / N).toFixed(1)}/${(bLeft / N).toFixed(1)}`);
}
