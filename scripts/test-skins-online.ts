// Teste E2E do visual online (Oficina do Exército, etapa 4): dois jogadores reais contra o
// servidor LOCAL (wrangler dev). Nunca aponta para o Cloudflare de produção.
// Antes: cd multiplayer-worker && npx wrangler dev --local --port 8787
// Rode com: bun run scripts/test-skins-online.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { ACTIVE_MAP } from "@/maps";
import { DEFAULT_SKINS } from "@/config/skinCatalog";
import type { ServerEvent, ClientEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev/.test(BASE)) throw new Error("Este teste só roda no servidor local.");

const buffers = new WeakMap<WebSocket, ServerEvent[]>();
let fails = 0;
const ok = (l: string, c = true) => { console.log(`  ${c ? "✔" : "✘"} ${l}`); if (!c) fails++; };

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buf: ServerEvent[] = [];
    buffers.set(ws, buf);
    ws.addEventListener("message", (ev: any) => buf.push(JSON.parse(ev.data)));
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}
const send = (ws: WebSocket, e: ClientEvent) => ws.send(JSON.stringify(e));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitFor(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 8000, fromIndex = 0): Promise<ServerEvent> {
  return new Promise((resolve, reject) => {
    const buf = buffers.get(ws)!;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const f = buf.slice(fromIndex).find(pred);
      if (f) { clearInterval(iv); resolve(f); }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error("timeout: " + pred.toString())); }
    }, 40);
  });
}
const skinsEvents = (ws: WebSocket) => buffers.get(ws)!.filter((m) => m.type === "SkinsUpdated") as Extract<ServerEvent, { type: "SkinsUpdated" }>[];

async function login(nick: string, pass: string): Promise<WebSocket> {
  const reg = await connect(BASE + "/connect");
  await waitFor(reg, (m) => m.type === "PlayerConnected");
  send(reg, { type: "Register", nickname: nick, email: nick + "@test.com", password: pass });
  const r: any = await waitFor(reg, (m) => m.type === "VerificationRequired" || m.type === "AuthError");
  if (r.type !== "VerificationRequired" || !r.devCode) throw new Error("Cadastro falhou: " + (r.reason ?? "sem código (rode o servidor local com DEV_SHOW_CODE=1)"));
  // Confirma o e-mail com o código que o modo de desenvolvimento devolve (docs/16 - Sistema de Contas).
  send(reg, { type: "VerifyEmail", nickname: nick, code: r.devCode });
  const v = await waitFor(reg, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (v.type !== "AuthSuccess") throw new Error("Confirmação falhou: " + (v as any).reason);
  reg.close();
  const ws = await connect(BASE + "/connect");
  await waitFor(ws, (m) => m.type === "PlayerConnected");
  send(ws, { type: "Login", nickname: nick, password: pass });
  const l = await waitFor(ws, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (l.type !== "AuthSuccess") throw new Error("Login falhou: " + (l as any).reason);
  return ws;
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  console.log("== Contas e sala ==");
  const lobbyA = await login("skinA_" + rand, "senha1234");
  const lobbyB = await login("skinB_" + rand, "senha1234");
  send(lobbyA, { type: "CreateRoom" });
  const created: any = await waitFor(lobbyA, (m) => m.type === "RoomCreated" || m.type === "ActionRejected");
  if (created.type !== "RoomCreated") throw new Error("CreateRoom: " + created.reason);
  const roomId = created.roomId;
  const wsA = await connect(BASE + `/room/${roomId}/ws?playerId=${created.you.playerId}`);
  await waitFor(wsA, (m) => m.type === "RoomStateChanged");
  send(lobbyB, { type: "JoinRoom", roomId });
  const joined: any = await waitFor(lobbyB, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");
  if (joined.type !== "RoomJoined") throw new Error("JoinRoom: " + joined.reason);
  const wsB = await connect(BASE + `/room/${roomId}/ws?playerId=${joined.you.playerId}`);
  await waitFor(wsB, (m) => m.type === "RoomStateChanged");
  ok("sala criada e dois jogadores dentro (A = " + created.you.owner + ", B = " + joined.you.owner + ")");

  console.log("== Ao entrar, o servidor manda o visual conhecido ==");
  await waitFor(wsA, (m) => m.type === "SkinsUpdated");
  await waitFor(wsB, (m) => m.type === "SkinsUpdated");
  ok("os dois receberam SkinsUpdated na conexão");

  console.log("== A escolhe um visual válido; B recebe ==");
  const skinsA: any = JSON.parse(JSON.stringify(DEFAULT_SKINS));
  skinsA.infantry = { model: "Skeleton_Warrior", color: "roxo", hat: "mineracao", weapon: "machado-esq", shield: "caveira" };
  const nB = skinsEvents(wsB).length;
  send(wsA, { type: "SetSkins", skins: skinsA });
  await waitFor(wsB, (m) => m.type === "SkinsUpdated" && (m.skins as any)[created.you.owner]?.infantry?.model === "Skeleton_Warrior");
  const evB = skinsEvents(wsB).at(-1)!;
  ok("B recebeu o visual de A", (evB.skins as any)[created.you.owner].infantry.weapon === "machado-esq");
  ok("o evento chegou a B depois da escolha (não é o antigo)", skinsEvents(wsB).length > nB);
  ok("A também recebeu a confirmação do servidor", skinsEvents(wsA).some((e) => (e.skins as any)[created.you.owner]?.infantry?.model === "Skeleton_Warrior"));

  console.log("== A tenta mandar lixo; o servidor corrige ==");
  const evil: any = { commander: { model: "Hacker", color: "neon", hat: "<script>", weapon: "nuke", shield: 9 }, infantry: { model: "Knight", extra: "x" }, bomb: { model: "Knight" } };
  send(wsA, { type: "SetSkins", skins: evil });
  await waitFor(wsB, (m) => m.type === "SkinsUpdated" && (m.skins as any)[created.you.owner]?.infantry?.model === "Knight");
  const ownA: any = (skinsEvents(wsB).at(-1)!.skins as any)[created.you.owner];
  ok("modelo inventado virou o padrão do Comandante", ownA.commander.model === DEFAULT_SKINS.commander.model && ownA.commander.hat === "padrao");
  ok("campos e peças extras foram descartados", !("extra" in ownA.infantry) && !("bomb" in ownA));

  console.log("== B não consegue mexer no visual de A ==");
  const skinsB: any = JSON.parse(JSON.stringify(DEFAULT_SKINS));
  skinsB.scout = { model: "Mage", color: "verde", hat: "quepe", weapon: "varinha", shield: "nenhum" };
  send(wsB, { type: "SetSkins", skins: skinsB });
  await waitFor(wsA, (m) => m.type === "SkinsUpdated" && (m.skins as any)[joined.you.owner]?.scout?.model === "Mage");
  const last: any = skinsEvents(wsA).at(-1)!.skins;
  ok("cada lado guarda só o próprio visual (A segue com Cavaleiro na Infantaria)", last[created.you.owner].infantry.model === "Knight" && last[joined.you.owner].scout.model === "Mage");

  console.log("== Posicionamento e início da partida ==");
  send(wsA, { type: "PlayerReady" });
  send(wsB, { type: "PlayerReady" });
  await waitFor(wsA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  send(wsA, { type: "SetSkins", skins: skinsA });
  await sleep(500);
  ok("durante o posicionamento ainda dá para mudar o visual", skinsEvents(wsB).at(-1) !== undefined && (skinsEvents(wsB).at(-1)!.skins as any)[created.you.owner].infantry.model === "Skeleton_Warrior");
  const blue = DeploymentManager.createDefaultPlayerDeployment(ACTIVE_MAP.rows, ACTIVE_MAP.cols, "blue");
  const red = DeploymentManager.createDefaultPlayerDeployment(ACTIVE_MAP.rows, ACTIVE_MAP.cols, "red");
  const piecesA = created.you.owner === "blue" ? blue : red;
  const piecesB = joined.you.owner === "blue" ? blue : red;
  send(wsA, { type: "ConfirmDeployment", pieces: piecesA });
  send(wsB, { type: "ConfirmDeployment", pieces: piecesB });
  await waitFor(wsA, (m) => m.type === "GameStarted");
  await waitFor(wsB, (m) => m.type === "GameStarted");
  ok("partida começou para os dois");

  console.log("== Com a partida em andamento o visual trava ==");
  const countB = skinsEvents(wsB).length;
  const bufA = buffers.get(wsA)!.length;
  send(wsA, { type: "SetSkins", skins: JSON.parse(JSON.stringify(DEFAULT_SKINS)) });
  const rej: any = await waitFor(wsA, (m) => m.type === "ActionRejected", 4000, bufA);
  ok("servidor recusou: \"" + rej.reason + "\"", /partida/i.test(rej.reason));
  await sleep(400);
  ok("B não recebeu nenhuma mudança", skinsEvents(wsB).length === countB);

  console.log("== Reconexão durante a partida devolve o visual ==");
  wsB.close();
  await sleep(500);
  const wsB2 = await connect(BASE + `/room/${roomId}/ws?playerId=${joined.you.playerId}`);
  const re: any = await waitFor(wsB2, (m) => m.type === "SkinsUpdated");
  ok("B reconectou e recebeu o visual dos dois lados", (re.skins as any)[created.you.owner]?.infantry?.model === "Skeleton_Warrior" && (re.skins as any)[joined.you.owner]?.scout?.model === "Mage");

  for (const w of [wsA, wsB2, lobbyA, lobbyB]) try { w.close(); } catch {}
  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => { console.error("ERRO:", e.message ?? e); process.exit(1); });
