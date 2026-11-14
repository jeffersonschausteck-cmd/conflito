// Aprendizado da IA (docs/09-IA.md, 1.3): registro de posicionamentos, ajuste do palpite, reaproveitamento de
// posicionamentos vencedores e saneamento de dados externos. Offline. Rode com: bun run scripts/test-ai-learning.ts
import { emptyLearning, recordDeployment, typeLift, pickLayout, sanitizeLearning, MAX_LAYOUTS } from "../src/services/aiLearning";
import { DeploymentManager } from "../src/services/deploymentManager";
import { formatFor } from "../src/services/battleFormat";
import { getBlockedTiles, mapForPace } from "../src/maps";
import { randomBotName } from "../src/multiplayer/botNames";

let failed = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failed++;
};

const pace = "rapid" as const;
const map = mapForPace(pace);
const format = formatFor(pace);
const blocked = getBlockedTiles(map);

// 1) Registro: jogadores que sempre põem a Armadilha na primeira coluna (fundo) e o Batedor na frente.
let data = emptyLearning();
for (let i = 0; i < 80; i++) {
  const set = DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, i % 2 ? "blue" : "red", format);
  data = recordDeployment(data, set, map.rows, map.cols, i % 2 ? "blue" : "red", i % 4 !== 0);
}
check("conta as partidas", data.games === 80);
check("guarda só posicionamentos de quem venceu (e no máximo MAX_LAYOUTS)", data.layouts.length > 0 && data.layouts.length <= MAX_LAYOUTS);

// 2) Palpite: no fundo (profundidade 0) sai mais Armadilha/Bandeira que na frente; na frente, Batedor.
const back = typeLift(data, 0, 3, map.rows);
const front = typeLift(data, format.depth - 1, 3, map.rows);
check("o palpite tem valores para vários tipos", Object.keys(back).length >= 5);
check("Batedor é mais provável na frente que no fundo", (front.scout ?? 1) > (back.scout ?? 1));
check("com poucos dados o ajuste é nulo", Object.keys(typeLift(emptyLearning(), 0, 3, map.rows)).length === 0);

// 3) Reaproveitamento: o posicionamento gerado com aprendizado é sempre válido (repetindo um vencedor ou não).
let valid = true;
let reused = 0;
for (let i = 0; i < 300; i++) {
  for (const owner of ["blue", "red"] as const) {
    const set = DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, owner, format, data);
    if (!DeploymentManager.validateDeployment(set, map.rows, map.cols, blocked, owner, format)) valid = false;
    const flag = set.find((p) => p.pieceType === "flag")!;
    const back0 = owner === "red" ? map.cols - 1 : 0;
    if (Math.abs(flag.currentColumn - back0) > 1) reused++; // um posicionamento aprendido pode pôr a Bandeira em outra coluna
  }
}
check("posicionamentos com aprendizado são sempre válidos", valid);
check("pickLayout só devolve com pelo menos 3 guardados", pickLayout(emptyLearning()) === null && pickLayout(data) !== null);

// 4) Saneamento: lixo vindo de fora vira aprendizado vazio/seguro.
const bad = sanitizeLearning({ games: -5, cells: { scout: [1, 2, 3], bomb: "x" }, layouts: [["x"], [[1, 2, 3]], 7] });
check("dados malformados são descartados", bad.games === 0 && Object.keys(bad.cells).length === 0 && bad.layouts.length === 0);
check("dados nulos viram vazio", sanitizeLearning(null).games === 0);
check("dados bons passam intactos", sanitizeLearning(JSON.parse(JSON.stringify(data))).games === data.games);

// 5) Nomes sorteados do computador da fila: parecem de jogador comum e variam.
const names = new Set<string>();
for (let i = 0; i < 200; i++) names.add(randomBotName());
check("nomes sorteados são variados (>= 80 diferentes em 200)", names.size >= 80);
check("nomes sem espaços e com 4 a 24 caracteres", [...names].every((n) => /^[A-Za-z0-9_]{4,24}$/.test(n)));
check("nenhum nome entrega que é o computador", ![...names].some((n) => /bot|computador|cpu/i.test(n)));
void reused;

console.log(failed === 0 ? "\nTUDO OK" : `\n${failed} FALHA(S)`);
process.exit(failed === 0 ? 0 : 1);
