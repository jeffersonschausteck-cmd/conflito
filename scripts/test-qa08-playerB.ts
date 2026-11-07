// Sprint QA-08 — atua como Jogador B (script) enquanto um navegador
// real atua como Jogador A, para confirmar que os dois compartilham o
// MESMO GameState e que nenhuma IA local interfere no lado Vermelho.
// Uso: bun run scripts/test-qa08-playerB.ts <roomId>

import { DeploymentManager } from "@/services/deploymentManager";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import { rehydrateGameState } from "@/multiplayer/NetworkClient";

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";
const roomId = process.argv[2];
if (!roomId) throw new Error("Uso: bun run scripts/test-qa08-playerB.ts <roomId>");

const buffers = new WeakMap<WebSocket, any[]>();
function rehydrate(event: any) {
  if (event && "state" in event && event.state) return { ...event, state: rehydrateGameState(event.state) };
  return event;
}
function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buffer: any[] = [];
    buffers.set(ws, buffer);
    ws.addEventListener("message", (ev: any) => {
      const msg = rehydrate(JSON.parse(ev.data));
      console.log("  <-", msg.type, JSON.stringify(msg).slice(0, 150));
      buffer.push(msg);
    });
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}
function waitFor(ws: WebSocket, predicate: (m: any) => boolean, timeoutMs = 15000): Promise<any> {
  const buffer = buffers.get(ws)!;
  return new Promise((resolve, reject) => {
    const check = () => buffer.find(predicate) ?? null;
    const existing = check();
    if (existing) return resolve(existing);
    const t = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    const interval = setInterval(() => {
      const found = check();
      if (found) {
        clearTimeout(t);
        clearInterval(interval);
        resolve(found);
      }
    }, 100);
  });
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  console.log(`== Jogador B (script): Login + Entrar na sala ${roomId} ==`);
  const ws = await connect(BASE + "/connect");
  await waitFor(ws, (m) => m.type === "PlayerConnected");
  ws.send(JSON.stringify({ type: "Register", nickname: "qa08_scriptB_" + rand, email: "b@t.com", password: "senha1234" }));
  const auth = await waitFor(ws, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (auth.type !== "AuthSuccess") throw new Error("Login falhou: " + auth.reason);

  ws.send(JSON.stringify({ type: "JoinRoom", roomId }));
  const joined = await waitFor(ws, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");
  if (joined.type !== "RoomJoined") throw new Error("JoinRoom falhou: " + joined.reason);
  console.log(`Entrou como ${joined.you.owner.toUpperCase()} (esperado: RED)`);
  const playerId = joined.you.playerId;

  const wsRoom = await connect(BASE + `/room/${joined.roomId}/ws?playerId=${playerId}`);
  await waitFor(wsRoom, (m) => m.type === "RoomStateChanged");

  console.log("== Aguardando A clicar em Pronto, então B também fica Pronto ==");
  await waitFor(wsRoom, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  wsRoom.send(JSON.stringify({ type: "PlayerReady" }));
  await waitFor(wsRoom, (m) => m.type === "RoomStateChanged" && m.status === "deployment", 30000);
  console.log("Fase de posicionamento — aguardando A confirmar posicionamento também...");

  const rows = ACTIVE_MAP.rows;
  const cols = ACTIVE_MAP.cols;
  const blockedTiles = getBlockedTiles(ACTIVE_MAP);
  const redPieces = DeploymentManager.createDefaultPlayerDeployment(rows, cols, "red");
  wsRoom.send(JSON.stringify({ type: "ConfirmDeployment", pieces: redPieces }));

  const started = await waitFor(wsRoom, (m) => m.type === "GameStarted", 30000);
  console.log(`\n>>> GameStarted recebido por B. turnNumber=${started.state.turnNumber} currentPlayer=${started.state.currentPlayer} pieces=${started.state.pieces.length}`);
  console.log(">>> Observando por 20s se alguma IA local move peças vermelhas sem B ter clicado...");

  let sawUnexpectedMove = false;
  const startTime = Date.now();
  const buffer = buffers.get(wsRoom)!;
  const seenBefore = buffer.length;
  while (Date.now() - startTime < 20000) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  const newMsgs = buffer.slice(seenBefore);
  const actionApplied = newMsgs.filter((m) => m.type === "ActionApplied");
  console.log(`\n>>> Em 20s, ${actionApplied.length} ActionApplied chegaram (B não clicou em nada) — deveria ser 0.`);
  if (actionApplied.length > 0) {
    console.log(">>> Conteúdo:", JSON.stringify(actionApplied.map((m) => ({ appliedBy: m.appliedBy, currentPlayer: m.state.currentPlayer }))));
  }

  process.exit(actionApplied.length > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
