// Revanche online (docs/10-Multiplayer.md), contra o servidor LOCAL (wrangler dev). Joga uma partida inteira (IA nos dois
// lados, pelo protocolo real), pede revanche e confere: o pedido de um só espera, o dos dois leva a sala de volta ao
// Posicionamento com novo prazo, e uma nova partida começa no mesmo mapa. Nunca roda em produção.
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-rematch.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { AIEngine } from "@/services/aiEngine";
import { formatFor } from "@/services/battleFormat";
import { getBlockedTiles, mapForPace } from "@/maps";
import type { GameState } from "@/types/gameState";
import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");

let fails = 0;
const ok = (label: string, cond = true) => {
  console.log(`  ${cond ? "✔" : "✘"} ${label}`);
  if (!cond) fails++;
};

const buffers = new WeakMap<WebSocket, ServerEvent[]>();
function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buf: ServerEvent[] = [];
    buffers.set(ws, buf);
    ws.addEventListener("message", (ev: any) => buf.push(JSON.parse(ev.data) as ServerEvent));
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}
const send = (ws: WebSocket, e: ClientEvent) => ws.send(JSON.stringify(e));
/** Espera um evento NOVO (depois de agora) que satisfaça o predicado. */
function next(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 10000): Promise<ServerEvent> {
  const buf = buffers.get(ws)!;
  const from = buf.length;
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const f = buf.slice(from).find(pred);
      if (f) {
        clearInterval(iv);
        resolve(f);
      } else if (Date.now() - t0 > timeoutMs) {
        clearInterval(iv);
        reject(new Error("timeout: " + pred.toString()));
      }
    }, 20);
  });
}
function waitFor(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 10000): Promise<ServerEvent> {
  const have = buffers.get(ws)!.find(pred);
  return have ? Promise.resolve(have) : next(ws, pred, timeoutMs);
}

/** O servidor manda as casas bloqueadas como lista; o cliente real as transforma em Set (NetworkClient). */
const hydrate = (s: any): GameState => ({ ...s, config: { ...s.config, blockedTiles: new Set<string>(s.config.blockedTiles) } });

async function account(nick: string): Promise<WebSocket> {
  const ws = await connect(BASE + "/connect");
  await waitFor(ws, (m) => m.type === "PlayerConnected");
  const p1 = next(ws, (m) => m.type === "VerificationRequired" || m.type === "AuthError");
  send(ws, { type: "Register", nickname: nick, email: `${nick}@teste.com`, password: "senha1234" });
  const reg = (await p1) as any;
  if (reg.type !== "VerificationRequired" || !reg.devCode) throw new Error("Cadastro: " + JSON.stringify(reg));
  const p2 = next(ws, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  send(ws, { type: "VerifyEmail", nickname: nick, code: reg.devCode });
  const done = (await p2) as any;
  if (done.type !== "AuthSuccess") throw new Error("Confirmação: " + JSON.stringify(done));
  return ws;
}

async function main() {
  const stamp = Date.now().toString(36);
  const hostLobby = await account(`rev_a_${stamp}`);
  const guestLobby = await account(`rev_b_${stamp}`);
  const pace = "blitz" as const;
  const mapId = "vale-blitz";
  const map = mapForPace(pace, mapId);
  const format = formatFor(pace);

  send(hostLobby, { type: "CreateRoom", pace, mapId } as ClientEvent);
  const created = (await next(hostLobby, (m) => m.type === "RoomCreated")) as any;
  const roomA = await connect(BASE + `/room/${created.roomId}/ws?playerId=${created.you.playerId}`);
  await waitFor(roomA, (m) => m.type === "RoomStateChanged");
  send(guestLobby, { type: "JoinRoom", roomId: created.roomId });
  const joined = (await next(guestLobby, (m) => m.type === "RoomJoined")) as any;
  const roomB = await connect(BASE + `/room/${created.roomId}/ws?playerId=${joined.you.playerId}`);
  await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  send(roomA, { type: "PlayerReady" });
  send(roomB, { type: "PlayerReady" });
  await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");

  const deployBoth = async () => {
    const startedA = next(roomA, (m) => m.type === "GameStarted", 15000);
    const startedB = next(roomB, (m) => m.type === "GameStarted", 15000);
    const blocked = getBlockedTiles(map);
    send(roomA, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "blue", format) });
    send(roomB, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "red", format) });
    const [a] = (await Promise.all([startedA, startedB])) as any[];
    return a;
  };

  console.log("Partida 1");
  let started = await deployBoth();
  const firstMatchStart = started.matchStartTime as number;
  ok("a partida 1 começa no mapa escolhido", started.state.config.mapId === mapId);

  // Pedir revanche no meio da partida é recusado.
  const early = next(roomA, (m) => m.type === "ActionRejected");
  send(roomA, { type: "Rematch" });
  ok("revanche com a partida em andamento é recusada", ((await early) as any).type === "ActionRejected");

  // Joga a partida inteira com a IA, pelo protocolo. Cada lado decide só com o que o servidor lhe mandou
  // (informação oculta: as peças do adversário chegam sem tipo).
  const startedB = (await waitFor(roomB, (m) => m.type === "GameStarted")) as any;
  let state = hydrate(started.state);
  let stateB = hydrate(startedB.state);
  let plies = 0;
  while (!state.gameOver && plies < 1500) {
    const blueTurn = state.currentPlayer === "BLUE";
    const ws = blueTurn ? roomA : roomB;
    const view = blueTurn ? state : stateB;
    const d = AIEngine.chooseMove(view, view.currentPlayer, { memoryKey: `rematch-${blueTurn ? "a" : "b"}-${firstMatchStart}` });
    const isEnd = (m: ServerEvent) => m.type === "ActionApplied" || m.type === "GameFinished" || m.type === "ActionRejected";
    const waitEvA = next(roomA, isEnd, 15000);
    const waitEvB = next(roomB, isEnd, 15000);
    if (!d) {
      send(ws, { type: "EndTurn" });
    } else {
      send(ws, { type: "MovePiece", pieceId: d.piece.id, row: d.target.row, column: d.target.column });
    }
    const ev = (await waitEvA) as any;
    const evB = (await waitEvB) as any;
    if (ev.type === "ActionRejected") throw new Error("jogada recusada: " + ev.reason);
    state = hydrate(ev.state);
    stateB = hydrate(evB.state);
    plies++;
  }
  ok(`a partida 1 terminou com vencedor (${plies} jogadas)`, state.gameOver && !!state.winner);
  await waitFor(roomB, (m) => m.type === "GameFinished");

  console.log("\nRevanche");
  // Um só pede: espera.
  const waitA = next(roomA, (m) => m.type === "RoomStateChanged");
  const waitB = next(roomB, (m) => m.type === "RoomStateChanged");
  send(roomA, { type: "Rematch" });
  const a1 = (await waitA) as any;
  const b1 = (await waitB) as any;
  ok("quem pede espera: a sala continua finalizada", a1.status === "finished" && b1.status === "finished");
  ok("os dois jogadores veem quem já pediu", a1.rematchPlayerIds.length === 1 && b1.rematchPlayerIds[0] === created.you.playerId);

  // Os dois pedem: volta ao Posicionamento, tudo zerado.
  const depA = next(roomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  const depB = next(roomB, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  send(roomB, { type: "Rematch" });
  const da = (await depA) as any;
  const db = (await depB) as any;
  ok("a sala volta ao Posicionamento nos dois", da.status === "deployment" && db.status === "deployment");
  ok("novo prazo de Posicionamento", typeof da.deploymentDeadline === "number" && da.deploymentDeadline > Date.now() && da.deploymentDeadline === db.deploymentDeadline);
  ok("nenhum pedido pendente e ninguém posicionado", da.rematchPlayerIds.length === 0 && da.deployedPlayerIds.length === 0);
  ok("mesmo modo, mapa e lados", da.pace === pace && da.mapId === mapId && da.players.length === 2);

  console.log("\nPartida 2");
  started = await deployBoth();
  const s2 = hydrate(started.state);
  ok("a partida 2 começa do zero (turno 1, ninguém vencedor)", !s2.gameOver && s2.turnNumber === 1 && s2.winner === null);
  ok("todas as peças vivas nos dois lados", s2.pieces.filter((p) => p.isAlive).length === 2 * 21 || s2.pieces.every((p) => p.isAlive));
  ok("no mesmo mapa", s2.config.mapId === mapId);
  ok("novo instante de início", started.matchStartTime > firstMatchStart);

  // Uma jogada na partida 2 funciona.
  // (a visão do azul serve para o azul; se for a vez do vermelho, ele decide pela visão que recebeu)
  const startedB2 = (await waitFor(roomB, (m) => m.type === "GameStarted" && (m as any).matchStartTime === started.matchStartTime)) as any;
  const view2 = s2.currentPlayer === "BLUE" ? s2 : hydrate(startedB2.state);
  const d2 = AIEngine.chooseMove(view2, view2.currentPlayer)!;
  const moved = next(roomA, (m) => m.type === "ActionApplied", 10000);
  send(s2.currentPlayer === "BLUE" ? roomA : roomB, { type: "MovePiece", pieceId: d2.piece.id, row: d2.target.row, column: d2.target.column });
  ok("jogada aceita na partida 2", ((await moved) as any).type === "ActionApplied");

  roomA.close();
  roomB.close();
  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no teste:", e);
  process.exit(1);
});
