// Partidas completas (IA × IA, sem tela) em cada um dos 15 mapas (docs/19-Mapas.md): o posicionamento é válido,
// o Motor joga sem erro com o terreno do mapa e a partida termina com vencedor. Offline.
// Rode com: bun run scripts/test-maps-play.ts [partidas por mapa]
import { GameEngine } from "../src/services/gameEngine";
import { AIEngine } from "../src/services/aiEngine";
import { DeploymentManager } from "../src/services/deploymentManager";
import { formatFor } from "../src/services/battleFormat";
import { MAPS, getBlockedTiles } from "../src/maps";
import { SIZES } from "../src/maps/gallery";

const GAMES = Number(process.argv[2] ?? 3);
const MAX_PLIES = 2500; // duas defesas fortes (IA nova) podem levar muitas jogadas; o limite só evita laço infinito
let failed = 0;
const check = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${extra ? " " + extra : ""}`);
  if (!cond) failed++;
};

for (const [id, map] of Object.entries(MAPS)) {
  const format = formatFor(map.pace);
  const blocked = getBlockedTiles(map);
  let finished = 0;
  let totalPlies = 0;
  let zoneOk = true;
  let errored: string | null = null;
  for (let g = 0; g < GAMES; g++) {
    try {
      const blue = DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "blue", format);
      const red = DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "red", format);
      if (!DeploymentManager.validateDeployment(blue, map.rows, map.cols, blocked, "blue", format) || !DeploymentManager.validateDeployment(red, map.rows, map.cols, blocked, "red", format)) zoneOk = false;
      let s = GameEngine.createInitialState({ rows: map.rows, cols: map.cols, blockedTiles: blocked, pace: map.pace, mapId: id });
      s = { ...s, pieces: [...blue, ...red] };
      let plies = 0;
      while (!s.gameOver && plies < MAX_PLIES) {
        const d = AIEngine.chooseMove(s, s.currentPlayer);
        if (!d) break;
        s = GameEngine.reduce(s, { type: "SELECT_PIECE", pieceId: d.piece.id });
        s = GameEngine.reduce(s, { type: "MOVE_SELECTED", row: d.target.row, column: d.target.column });
        plies++;
      }
      if (s.gameOver && s.winner) finished++;
      totalPlies += plies;
      if (s.config.mapId !== id) errored = "o mapa não ficou guardado na configuração";
    } catch (e) {
      errored = String(e);
    }
  }
  check(`${id} (${SIZES[map.pace].rows}×${SIZES[map.pace].cols}): posicionamento válido nos dois lados`, zoneOk);
  // Duas defesas fortes podem chegar a um fim de jogo sem vitória possível (sem Sapadores contra Armadilhas); por isso basta a maioria.
  check(`${id}: a maioria das ${GAMES} partidas termina com vencedor`, finished >= Math.ceil(GAMES * 0.6) && !errored, `(${finished}/${GAMES}, média ${Math.round(totalPlies / GAMES)} jogadas${errored ? ", erro: " + errored : ""})`);
}

console.log(failed === 0 ? "\nTUDO OK" : `\n${failed} FALHA(S)`);
process.exit(failed === 0 ? 0 : 1);
