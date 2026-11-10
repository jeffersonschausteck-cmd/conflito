// Modos de jogo (docs/04-Regras.md, seções 12, 17 e 19): formatos de cada modo e fim por falta de peça móvel.
import { GameEngine } from "../src/services/gameEngine";
import { armySize, formatFor } from "../src/services/battleFormat";
import { InitialSetup } from "../src/services/initialSetup";
import { DeploymentManager } from "../src/services/deploymentManager";
import { getBlockedTiles, mapForPace } from "../src/maps";
import { PIECES } from "../src/config/pieces";

const TYPES = Object.keys(PIECES) as (keyof typeof PIECES)[];
let failed = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "ok  " : "FALHOU"} ${msg}`);
  if (!cond) failed++;
};

// formatos por modo (seção 19)
const sizes = { classic: 40, rapid: 30, blitz: 24 } as const;
for (const pace of ["classic", "rapid", "blitz"] as const) {
  const f = formatFor(pace);
  const map = mapForPace(pace);
  ok(armySize(f) === sizes[pace], `${pace}: exército de ${sizes[pace]} peças`);
  ok(pace === "classic" || f.rows * f.depth === sizes[pace], `${pace}: exército cabe na zona (${f.rows} linhas x ${f.depth} colunas)`);
  ok(map.rows === f.rows && map.cols === f.cols, `${pace}: mapa ${map.rows}x${map.cols} igual ao formato`);
  const all = InitialSetup.generate({ rows: f.rows, cols: f.cols, format: f });
  const blue = all.filter((p) => p.owner === "blue");
  const red = all.filter((p) => p.owner === "red");
  ok(blue.length === sizes[pace] && red.length === sizes[pace], `${pace}: posicionamento inicial com ${sizes[pace]} peças de cada lado`);
  const blocked = getBlockedTiles(map);
  ok(DeploymentManager.validateDeployment(blue, f.rows, f.cols, blocked, "blue", f) && DeploymentManager.validateDeployment(red, f.rows, f.cols, blocked, "red", f), `${pace}: posicionamento padrão é válido (dentro da zona, sem sobreposição nem obstáculo)`);
  const ai = DeploymentManager.generateAIDeployment(f.rows, f.cols, blocked, "red", f);
  ok(DeploymentManager.validateDeployment(ai, f.rows, f.cols, blocked, "red", f), `${pace}: posicionamento da IA é válido`);
  const counts = (arr: typeof blue) => TYPES.every((t) => arr.filter((p) => p.pieceType === t).length === f.roster[t]);
  ok(counts(blue) && counts(red), `${pace}: composição do exército confere com o formato`);
}

// os modos não têm relógio, limite de rodadas nem pontuação: o estado inicial não carrega regras extras
{
  const s = GameEngine.createInitialState({ rows: 10, cols: 14, pace: "rapid" });
  ok(!("rules" in s.config) && s.endReason === null && !s.gameOver, "modo curto: estado inicial sem regras de tempo");
  let t = s;
  t = { ...t, turnNumber: 500, actionLocked: true };
  ok(!GameEngine.finalizeTurn(t).gameOver, "partida longa nunca acaba por rodadas");
}

// jogador da vez sem peça móvel perde (seção 12)
{
  const s0 = GameEngine.createInitialState({ rows: 12, cols: 18 });
  const noMobile = { ...s0, turnNumber: 5, actionLocked: true, pieces: s0.pieces.map((p) => (p.owner === "red" && p.canMove ? { ...p, isAlive: false } : p)) };
  // depois da jogada do Azul a vez passa ao Vermelho, que não tem peça móvel
  const r = GameEngine.finalizeTurn(noMobile);
  ok(r.gameOver && r.winner === "BLUE" && r.endReason === "blocked", "sem peça móvel na vez: o adversário vence");
  const normal = GameEngine.finalizeTurn({ ...s0, turnNumber: 5, actionLocked: true });
  ok(!normal.gameOver, "com peças móveis a partida segue");
}

console.log(failed ? `\n${failed} FALHA(S)` : "\nTUDO OK");
process.exit(failed ? 1 : 0);
