// IA nova (v0.3, com posicionamento inteligente) contra a v0.2 e a v0.1 (copiadas aqui como referência).
// Roda partidas completas sem tela e confere o posicionamento. Uso: bun run scripts/test-ai.ts [partidas por lado] [blitz|rapid|classic]
import { GameEngine } from "../src/services/gameEngine";
import { AIEngine, type AIDecision } from "../src/services/aiEngine";
import { MovementEngine } from "../src/services/movementEngine";
import { PieceManager } from "../src/services/pieceManager";
import { DeploymentManager } from "../src/services/deploymentManager";
import { InitialSetup } from "../src/services/initialSetup";
import { formatFor, type BattleFormat } from "../src/services/battleFormat";
import { hexNeighbors } from "../src/services/hexNav";
import { AIEngineV02 } from "./ai-v02";
import { getBlockedTiles, mapForPace } from "../src/maps";
import type { GameState, Pace, Player } from "../src/types/gameState";
import { playerToOwner } from "../src/types/gameState";
import type { Piece, PlayerOwner } from "../src/types/piece";

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
    for (const target of MovementEngine.getLegalMoves(piece, state.pieces, bounds, state.config.blockedTiles ?? new Set<string>())) {
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

/** Posicionamento antigo: sorteio puro das peças nas casas livres da zona. */
function randomDeployment(rows: number, cols: number, blocked: ReadonlySet<string>, owner: PlayerOwner, format: BattleFormat): Piece[] {
  const mine = InitialSetup.generate({ rows, cols, format }).filter((p) => p.owner === owner);
  const start = owner === "red" ? Math.max(0, cols - format.depth) : 0;
  const end = owner === "red" ? cols : Math.min(format.depth, cols);
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = start; c < end; c++) if (!blocked.has(`${r}-${c}`)) cells.push({ r, c });
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return mine.map((p, i) => ({ ...p, currentRow: cells[i].r, currentColumn: cells[i].c }));
}

interface Brain {
  choose: (s: GameState, p: Player) => AIDecision | null;
  deploy: (rows: number, cols: number, blocked: ReadonlySet<string>, owner: PlayerOwner, format: BattleFormat) => Piece[];
}
const brains: Record<string, Brain> = {
  // v0.3: posicionamento inteligente + jogadas novas
  nova: { choose: (s, p) => AIEngine.chooseMove(s, p), deploy: (r, c, b, o, f) => DeploymentManager.generateAIDeployment(r, c, b, o, f) },
  // v0.2: jogadas da versão anterior com sorteio puro no posicionamento
  v02: { choose: (s, p) => AIEngineV02.chooseMove(s, p), deploy: randomDeployment },
  antiga: { choose: legacyChoose, deploy: randomDeployment },
};

const MAX_PLIES = 700;
const pace = (process.argv[3] ?? "classic") as Pace;
const map = mapForPace(pace);
const format = formatFor(pace);

function play(blue: string, red: string) {
  const blocked = getBlockedTiles(map);
  let s = GameEngine.createInitialState({ rows: map.rows, cols: map.cols, blockedTiles: blocked, pace, mapId: map.id });
  s = {
    ...s,
    pieces: [...brains[blue].deploy(map.rows, map.cols, blocked, "blue", format), ...brains[red].deploy(map.rows, map.cols, blocked, "red", format)],
  };
  let plies = 0;
  while (!s.gameOver && plies < MAX_PLIES) {
    const brain = brains[s.currentPlayer === "BLUE" ? blue : red];
    const d = brain.choose(s, s.currentPlayer);
    if (!d) break;
    s = GameEngine.reduce(s, { type: "SELECT_PIECE", pieceId: d.piece.id });
    s = GameEngine.reduce(s, { type: "MOVE_SELECTED", row: d.target.row, column: d.target.column });
    plies++;
  }
  const alive = (o: "blue" | "red") => s.pieces.filter((p) => p.owner === o && p.isAlive).length;
  return { winner: s.winner, plies, blue: alive("blue"), red: alive("red") };
}

const N = Number(process.argv[2] ?? 20);
let failed = false;
for (const [a, b] of [["nova", "nova"], ["nova", "v02"], ["v02", "nova"], ["nova", "antiga"], ["antiga", "nova"]] as const) {
  let aWins = 0,
    bWins = 0,
    undecided = 0,
    plies = 0;
  for (let i = 0; i < N; i++) {
    const r = play(a, b);
    if (r.winner === "BLUE") aWins++;
    else if (r.winner === "RED") bWins++;
    else undecided++;
    plies += r.plies;
  }
  console.log(`Azul=${a} x Vermelho=${b}: Azul ${aWins} · Vermelho ${bWins} · sem fim ${undecided} | jogadas/partida ${Math.round(plies / N)}`);
}

// A bandeira da IA nova nunca fica na linha de frente nem solta: confere o posicionamento.
let exposed = 0;
let loose = 0;
const DEPLOYS = 200;
for (let i = 0; i < DEPLOYS; i++) {
  for (const owner of ["blue", "red"] as const) {
    const blocked = getBlockedTiles(map);
    const set = DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, owner, format);
    if (!DeploymentManager.validateDeployment(set, map.rows, map.cols, blocked, owner, format)) failed = true;
    const flag = set.find((p) => p.pieceType === "flag")!;
    const back = owner === "red" ? map.cols - 1 : 0;
    if (Math.abs(flag.currentColumn - back) > 1) exposed++;
    const occupied = (r: number, c: number) => set.some((p) => p.currentRow === r && p.currentColumn === c);
    const freeNeighbors = hexNeighbors(flag.currentRow, flag.currentColumn).filter(
      ([r, c]) => r >= 0 && r < map.rows && c >= 0 && c < map.cols && !blocked.has(`${r}-${c}`) && !occupied(r, c),
    );
    if (freeNeighbors.length > 0) loose++;
  }
}
console.log(`Posicionamento (${DEPLOYS * 2} sorteios): válidos ${failed ? "NÃO" : "sim"} | Bandeira longe do fundo: ${exposed} | Bandeira com casa vizinha vazia: ${loose}`);
if (failed || exposed > 0 || loose > 0) process.exit(1);
