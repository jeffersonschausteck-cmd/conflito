// Mapa da sala online (docs/19-Mapas.md e docs/10-Multiplayer.md), contra o servidor LOCAL (wrangler dev).
// Quem cria a sala escolhe o mapa; o servidor confere (mapa inválido ou de outro modo vira a Planície Real do modo),
// avisa quem entra, valida o posicionamento com o terreno do mapa e inicia a partida nele. Nunca roda em produção.
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-online-maps.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { formatFor } from "@/services/battleFormat";
import { getBlockedTiles, mapForPace } from "@/maps";
import type { Pace } from "@/types/gameState";
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
    }, 40);
  });
}
function waitFor(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 10000): Promise<ServerEvent> {
  const have = buffers.get(ws)!.find(pred);
  return have ? Promise.resolve(have) : next(ws, pred, timeoutMs);
}

async function lobby(): Promise<WebSocket> {
  const ws = await connect(BASE + "/connect");
  await waitFor(ws, (m) => m.type === "PlayerConnected");
  return ws;
}
async function account(nick: string): Promise<WebSocket> {
  const ws = await lobby();
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

async function createRoom(ws: WebSocket, pace: Pace, mapId?: string) {
  send(ws, { type: "CreateRoom", pace, mapId } as ClientEvent);
  const created = (await next(ws, (m) => m.type === "RoomCreated" || m.type === "ActionRejected")) as any;
  if (created.type !== "RoomCreated") throw new Error("CreateRoom: " + created.reason);
  return created;
}

async function main() {
  const stamp = Date.now().toString(36);
  const host = await account(`mapa_a_${stamp}`);
  const guest = await account(`mapa_b_${stamp}`);

  // ── Escolha do anfitrião e conferência do servidor ──
  console.log("Escolha e conferência do mapa");
  const cases: [Pace, string | undefined, string, string][] = [
    ["rapid", "bosque-rapid", "bosque-rapid", "mapa válido do modo"],
    ["classic", "fosso-classic", "fosso-classic", "outro mapa válido"],
    ["blitz", undefined, "planicie-blitz", "sem escolha"],
    ["rapid", "vale-classic", "planicie-rapid", "mapa de outro modo"],
    ["rapid", "mapa-que-nao-existe", "planicie-rapid", "mapa inexistente"],
  ];
  for (const [pace, asked, expected, why] of cases) {
    const created = await createRoom(host, pace, asked);
    ok(`${why}: a sala (${pace}) fica com ${expected}`, created.mapId === expected && created.pace === pace);
  }

  // ── Fluxo completo com um mapa escolhido ──
  for (const [pace, mapId] of [["rapid", "montanha-rapid"], ["blitz", "vale-blitz"], ["classic", "bosque-classic"]] as const) {
    console.log(`\nPartida online no mapa ${mapId}`);
    const created = await createRoom(host, pace, mapId);
    ok("RoomCreated traz o mapa escolhido", created.mapId === mapId);
    const roomA = await connect(BASE + `/room/${created.roomId}/ws?playerId=${created.you.playerId}`);
    const stA = (await waitFor(roomA, (m) => m.type === "RoomStateChanged")) as any;
    ok("o estado da sala (anfitrião) traz o mapa", stA.mapId === mapId && stA.pace === pace);
    send(guest, { type: "JoinRoom", roomId: created.roomId });
    const joined = (await next(guest, (m) => m.type === "RoomJoined" || m.type === "ActionRejected")) as any;
    ok("quem entra recebe o mapa da sala", joined.type === "RoomJoined" && joined.mapId === mapId && joined.pace === pace);
    const roomB = await connect(BASE + `/room/${created.roomId}/ws?playerId=${joined.you.playerId}`);
    const stB = (await waitFor(roomB, (m) => m.type === "RoomStateChanged")) as any;
    ok("o estado da sala (convidado) traz o mapa", stB.mapId === mapId);
    await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
    send(roomA, { type: "PlayerReady" });
    send(roomB, { type: "PlayerReady" });
    await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
    await waitFor(roomB, (m) => m.type === "RoomStateChanged" && m.status === "deployment");

    const map = mapForPace(pace, mapId);
    const f = formatFor(pace);
    send(roomA, { type: "ConfirmDeployment", pieces: DeploymentManager.createDefaultPlayerDeployment(map.rows, map.cols, "blue", f) });
    send(roomB, { type: "ConfirmDeployment", pieces: DeploymentManager.createDefaultPlayerDeployment(map.rows, map.cols, "red", f) });
    const started = (await waitFor(roomA, (m) => m.type === "GameStarted", 15000)) as any;
    await waitFor(roomB, (m) => m.type === "GameStarted", 15000);
    const cfg = started.state.config;
    const want = [...getBlockedTiles(map)].sort().join();
    const got = [...(cfg.blockedTiles as string[])].sort().join();
    ok("a partida começa no mapa escolhido (mapId na configuração)", cfg.mapId === mapId);
    ok(`o terreno da partida é o do mapa (${(cfg.blockedTiles as string[]).length} casas bloqueadas)`, got === want && cfg.rows === map.rows && cfg.cols === map.cols);
    roomA.close();
    roomB.close();
  }

  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no teste:", e);
  process.exit(1);
});
