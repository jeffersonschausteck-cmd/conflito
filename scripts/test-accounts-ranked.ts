// Teste E2E de contas e ranqueada contra o servidor LOCAL (wrangler dev). Nunca roda no Cloudflare de produção.
//   1) Cadastro com e-mail obrigatório e confirmação por código (docs/16 - Sistema de Contas).
//   2) Partidas online nos três modos: a ranqueada é separada por modo (cada um com os seus pontos e o seu ranking)
//      e a casual não mexe em pontos.
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-accounts-ranked.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { formatFor, armySize } from "@/services/battleFormat";
import { getBlockedTiles, mapForPace } from "@/maps";
import type { Pace } from "@/types/gameState";
import { rehydrateGameState } from "@/multiplayer/NetworkClient";
import type { ServerEvent, ClientEvent } from "@/multiplayer/protocol";
import type { Piece } from "@/types/piece";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");

const buffers = new WeakMap<WebSocket, ServerEvent[]>();
let fails = 0;
const ok = (label: string, cond = true) => {
  console.log(`  ${cond ? "✔" : "✘"} ${label}`);
  if (!cond) fails++;
};

function rehydrate(event: ServerEvent): ServerEvent {
  if ("state" in event && event.state) return { ...event, state: rehydrateGameState(event.state) } as ServerEvent;
  return event;
}
function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buf: ServerEvent[] = [];
    buffers.set(ws, buf);
    ws.addEventListener("message", (ev: any) => buf.push(rehydrate(JSON.parse(ev.data) as ServerEvent)));
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}
const send = (ws: WebSocket, e: ClientEvent) => ws.send(JSON.stringify(e));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Espera um evento que chegue DEPOIS de agora (ignora o que já estava no buffer). */
function next(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 8000): Promise<ServerEvent> {
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
function waitFor(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 8000): Promise<ServerEvent> {
  const buf = buffers.get(ws)!;
  const have = buf.find(pred);
  if (have) return Promise.resolve(have);
  return next(ws, pred, timeoutMs);
}

async function lobby(): Promise<WebSocket> {
  const ws = await connect(BASE + "/connect");
  await waitFor(ws, (m) => m.type === "PlayerConnected");
  return ws;
}

type Reply = Extract<ServerEvent, { type: "AuthSuccess" | "AuthError" | "VerificationRequired" }>;
const authReply = (m: ServerEvent) => m.type === "AuthSuccess" || m.type === "AuthError" || m.type === "VerificationRequired";
async function ask(ws: WebSocket, e: ClientEvent): Promise<Reply> {
  const p = next(ws, authReply);
  send(ws, e);
  return (await p) as Reply;
}

/** Cadastra, confirma o e-mail com o código do modo de desenvolvimento e devolve a conexão já autenticada. */
async function createVerifiedAccount(nick: string, pass: string): Promise<WebSocket> {
  const ws = await lobby();
  const reg = await ask(ws, { type: "Register", nickname: nick, email: `${nick}@teste.com`, password: pass });
  if (reg.type !== "VerificationRequired" || !reg.devCode) throw new Error("Cadastro não pediu código: " + JSON.stringify(reg));
  const done = await ask(ws, { type: "VerifyEmail", nickname: nick, code: reg.devCode });
  if (done.type !== "AuthSuccess") throw new Error("Confirmação falhou: " + JSON.stringify(done));
  return ws;
}

// ── Partida online com posicionamento que captura a Bandeira em um lance ──────────────────────────
function buildStrike(
  defaults: Piece[], owner: "blue" | "red", pace: Pace, strikeRow: number, type: string,
): { pieces: Piece[]; strikerId: string } {
  const f = formatFor(pace);
  const map = mapForPace(pace);
  const blocked = getBlockedTiles(map);
  const zoneStart = owner === "blue" ? 0 : Math.max(0, map.cols - f.depth);
  const zoneEnd = owner === "blue" ? f.depth : map.cols;
  const piece = defaults.find((p) => p.pieceType === type)!;
  // O atacante (ou a Bandeira) fica na coluna da frente da própria zona, na linha livre do meio do campo.
  const col = owner === "blue" ? zoneEnd - 1 : zoneStart;
  const cells: { row: number; column: number }[] = [];
  for (let r = 0; r < map.rows; r++) for (let c = zoneStart; c < zoneEnd; c++) if (!blocked.has(`${r}-${c}`) && !(r === strikeRow && c === col)) cells.push({ row: r, column: c });
  const others = defaults.filter((p) => p.id !== piece.id);
  return { pieces: [{ ...piece, currentRow: strikeRow, currentColumn: col }, ...others.map((p, i) => ({ ...p, currentRow: cells[i].row, currentColumn: cells[i].column }))], strikerId: piece.id };
}

/** `creator` cria a sala no modo `pace` (joga de Azul) e vence capturando a Bandeira de `joiner` (Vermelho). */
async function playStrikeMatch(creator: WebSocket, joiner: WebSocket, matchType: "ranked" | "casual", pace: Pace) {
  send(creator, { type: "CreateRoom", matchType, pace });
  const created = (await next(creator, (m) => m.type === "RoomCreated" || m.type === "ActionRejected")) as any;
  if (created.type !== "RoomCreated") throw new Error("CreateRoom: " + created.reason);
  const roomId = created.roomId;
  const roomA = await connect(BASE + `/room/${roomId}/ws?playerId=${created.you.playerId}`);
  await waitFor(roomA, (m) => m.type === "RoomStateChanged");
  send(joiner, { type: "JoinRoom", roomId });
  const joined = (await next(joiner, (m) => m.type === "RoomJoined" || m.type === "ActionRejected")) as any;
  if (joined.type !== "RoomJoined") throw new Error("JoinRoom: " + joined.reason);
  const roomB = await connect(BASE + `/room/${roomId}/ws?playerId=${joined.you.playerId}`);
  await waitFor(roomB, (m) => m.type === "RoomStateChanged");
  await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  send(roomA, { type: "PlayerReady" });
  send(roomB, { type: "PlayerReady" });
  await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  await waitFor(roomB, (m) => m.type === "RoomStateChanged" && m.status === "deployment");

  const map = mapForPace(pace);
  const f = formatFor(pace);
  const blocked = getBlockedTiles(map);
  let strikeRow = -1;
  for (let r = 0; r < map.rows && strikeRow < 0; r++) {
    let clear = true;
    for (let c = 0; c < map.cols; c++) if (blocked.has(`${r}-${c}`)) clear = false;
    if (clear) strikeRow = r;
  }
  const blue = buildStrike(DeploymentManager.createDefaultPlayerDeployment(map.rows, map.cols, "blue", f), "blue", pace, strikeRow, "scout");
  const red = buildStrike(DeploymentManager.createDefaultPlayerDeployment(map.rows, map.cols, "red", f), "red", pace, strikeRow, "flag");
  send(roomA, { type: "ConfirmDeployment", pieces: blue.pieces });
  send(roomB, { type: "ConfirmDeployment", pieces: red.pieces });
  const startedA = (await waitFor(roomA, (m) => m.type === "GameStarted")) as any;
  await waitFor(roomB, (m) => m.type === "GameStarted");
  const startState = startedA.state;
  const strikeCol = map.cols - f.depth; // coluna da Bandeira vermelha
  send(roomA, { type: "MovePiece", pieceId: blue.strikerId, row: strikeRow, column: strikeCol } as ClientEvent);
  const finA = (await waitFor(roomA, (m) => m.type === "GameFinished", 10000)) as any;
  const finB = (await waitFor(roomB, (m) => m.type === "GameFinished", 10000)) as any;
  roomA.close();
  roomB.close();
  return { finA, finB, created, joined, startState };
}

async function myStats(ws: WebSocket, pace: Pace) {
  const p = next(ws, (m) => m.type === "MyStatsData" && (m as any).pace === pace);
  send(ws, { type: "GetMyStats", pace });
  return ((await p) as any).stats;
}

async function board(ws: WebSocket, pace: Pace) {
  const p = next(ws, (m) => m.type === "LeaderboardData" && (m as any).pace === pace);
  send(ws, { type: "GetLeaderboard", limit: 100, pace });
  return ((await p) as any).entries as { username: string; rating: number }[];
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const pass = "senha1234";

  console.log("== 1. Cadastro com e-mail obrigatório e código ==");
  {
    const ws = await lobby();
    let r = await ask(ws, { type: "Register", nickname: "sememail_" + rand, email: "", password: pass });
    ok("e-mail vazio é recusado", r.type === "AuthError" && /e-mail/i.test(r.reason));
    r = await ask(ws, { type: "Register", nickname: "emailruim_" + rand, email: "isso-nao-e-email", password: pass });
    ok("e-mail inválido é recusado", r.type === "AuthError" && /e-mail/i.test(r.reason));

    const nick = "conf_" + rand;
    const email = `${nick}@teste.com`;
    r = await ask(ws, { type: "Register", nickname: nick, email, password: pass });
    ok("cadastro válido pede o código (sem sessão ainda)", r.type === "VerificationRequired" && r.nickname === nick);
    const dev = r.type === "VerificationRequired" ? r.devCode : undefined;
    ok("e-mail aparece mascarado na tela de confirmação", r.type === "VerificationRequired" && r.email.includes("*") && !r.email.startsWith(nick));
    ok("modo de desenvolvimento devolve o código de 6 dígitos", !!dev && /^\d{6}$/.test(dev));

    const ws2 = await lobby();
    const dup = await ask(ws2, { type: "Register", nickname: "outro_" + rand, email, password: pass });
    ok("o mesmo e-mail não cria uma segunda conta", dup.type === "AuthError" && /e-mail/i.test(dup.reason));
    const dupNick = await ask(ws2, { type: "Register", nickname: nick, email: "x" + email, password: pass });
    ok("nickname aguardando confirmação não é roubado", dupNick.type === "AuthError");

    const createRoomBefore = next(ws, (m) => m.type === "AuthError");
    send(ws, { type: "CreateRoom" });
    const blocked = (await createRoomBefore) as any;
    ok("sem confirmar, não dá para criar sala online", /autenticado/i.test(blocked.reason));

    const wrong = await ask(ws, { type: "VerifyEmail", nickname: nick, code: dev === "000000" ? "111111" : "000000" });
    ok("código errado é recusado e conta as tentativas", wrong.type === "AuthError" && /Restam 4/.test(wrong.reason));

    const quick = await ask(ws, { type: "ResendVerification", nickname: nick });
    ok("pedir outro código logo em seguida pede para aguardar", quick.type === "AuthError" && /Aguarde/.test(quick.reason));

    const login = await ask(ws2, { type: "Login", nickname: nick, password: pass });
    ok("login de conta não confirmada pede o código (não entra)", login.type === "VerificationRequired");

    const good = await ask(ws, { type: "VerifyEmail", nickname: nick, code: dev! });
    ok("código certo confirma a conta e já entra", good.type === "AuthSuccess");
    const again = await ask(ws2, { type: "VerifyEmail", nickname: nick, code: dev! });
    ok("o mesmo código não vale duas vezes", again.type === "AuthError");

    const ws3 = await lobby();
    const entered = await ask(ws3, { type: "Login", nickname: nick, password: pass });
    ok("depois de confirmada, o login entra normalmente", entered.type === "AuthSuccess");
    const badPass = await ask(await lobby(), { type: "Login", nickname: nick, password: "errada!!" });
    ok("senha errada continua sendo recusada", badPass.type === "AuthError");
  }

  console.log("== 2. Os três modos online e a ranqueada de cada um ==");
  const nickA = "rankA_" + rand;
  const nickB = "rankB_" + rand;
  const lobbyA = await createVerifiedAccount(nickA, pass);
  const lobbyB = await createVerifiedAccount(nickB, pass);
  const PACES: Pace[] = ["classic", "rapid", "blitz"];
  const rating = async (ws: WebSocket) => Object.fromEntries(await Promise.all(PACES.map(async (p) => [p, (await myStats(ws, p))?.rating ?? 500]))) as Record<Pace, number>;
  const matches = async (ws: WebSocket) => Object.fromEntries(await Promise.all(PACES.map(async (p) => [p, (await myStats(ws, p))?.rankedMatches ?? 0]))) as Record<Pace, number>;
  let a = await rating(lobbyA);
  let b = await rating(lobbyB);
  ok("contas novas começam com 500 pontos em cada um dos três modos", PACES.every((p) => a[p] === 500 && b[p] === 500));

  // Ranqueada na Partida Normal (rapid): A vence.
  const m1 = await playStrikeMatch(lobbyA, lobbyB, "ranked", "rapid");
  const size = (p: Pace) => armySize(formatFor(p));
  ok("Partida Normal: a sala e a partida chegam no modo certo (30 peças, 10x14)", m1.created.pace === "rapid" && m1.joined.pace === "rapid" && m1.startState.config.pace === "rapid" && m1.startState.config.rows === 10 && m1.startState.config.cols === 14 && m1.startState.pieces.length === size("rapid") * 2);
  ok("Partida Normal: Azul (A) vence", m1.finA.winner === "BLUE" && m1.finB.winner === "BLUE");
  await sleep(300);
  const a1 = await rating(lobbyA);
  const b1 = await rating(lobbyB);
  ok(`Partida Normal: A soma pontos (500 → ${a1.rapid}) e B perde (500 → ${b1.rapid})`, a1.rapid > 500 && b1.rapid < 500);
  ok("Partida Normal: os pontos dos OUTROS modos não mudam", a1.classic === 500 && a1.blitz === 500 && b1.classic === 500 && b1.blitz === 500);
  ok("Partida Normal: a tela final traz a variação de pontos do modo", m1.finA.ranking?.pace === "rapid" && m1.finA.ranking?.ratingAfter === a1.rapid && m1.finB.ranking?.ratingAfter === b1.rapid);

  // Ranqueada na Partida Rápida (blitz): B cria a sala (joga de Azul) e vence.
  const m2 = await playStrikeMatch(lobbyB, lobbyA, "ranked", "blitz");
  ok("Partida Rápida: a sala e a partida chegam no modo certo (24 peças, 8x12)", m2.startState.config.pace === "blitz" && m2.startState.config.rows === 8 && m2.startState.config.cols === 12 && m2.startState.pieces.length === size("blitz") * 2);
  await sleep(300);
  const a2 = await rating(lobbyA);
  const b2 = await rating(lobbyB);
  ok(`Partida Rápida: B vence (500 → ${b2.blitz}) e A perde (500 → ${a2.blitz})`, b2.blitz > 500 && a2.blitz < 500);
  ok("Partida Rápida: a Partida Normal e a Intensa seguem como estavam", a2.rapid === a1.rapid && b2.rapid === b1.rapid && a2.classic === 500 && b2.classic === 500);

  // Ranqueada na Partida Intensa (classic): A vence.
  const m3 = await playStrikeMatch(lobbyA, lobbyB, "ranked", "classic");
  ok("Partida Intensa: 40 peças em 12x18", m3.startState.config.pace === "classic" && m3.startState.config.rows === 12 && m3.startState.pieces.length === size("classic") * 2);
  await sleep(300);
  const a3 = await rating(lobbyA);
  const b3 = await rating(lobbyB);
  ok(`Partida Intensa: A soma (500 → ${a3.classic}) e B perde (500 → ${b3.classic})`, a3.classic > 500 && b3.classic < 500);
  ok("Partida Intensa: os outros dois modos seguem como estavam", a3.rapid === a2.rapid && a3.blitz === a2.blitz && b3.rapid === b2.rapid && b3.blitz === b2.blitz);

  // Não existe mais partida casual: mesmo pedindo "casual", a sala online vira ranqueada e vale pontos.
  const m4 = await playStrikeMatch(lobbyA, lobbyB, "casual", "rapid");
  ok("sala pedida como casual vira ranqueada (a tela final mostra a variação de pontos)", m4.finA.winner === "BLUE" && m4.finA.matchType === "ranked" && !!m4.finA.ranking);
  await sleep(300);
  const a4 = await rating(lobbyA);
  const b4 = await rating(lobbyB);
  const mm = await matches(lobbyA);
  ok("a partida pedida como casual mexeu só nos pontos da Partida Normal", a4.rapid > a3.rapid && b4.rapid < b3.rapid && a4.classic === a3.classic && a4.blitz === a3.blitz && b4.classic === b3.classic && b4.blitz === b3.blitz && mm.rapid === 2);

  // Ranking de cada modo: só traz quem jogou ranqueada nele, com a pontuação daquele modo.
  const lbClassic = await board(lobbyA, "classic");
  const lbRapid = await board(lobbyA, "rapid");
  const lbBlitz = await board(lobbyA, "blitz");
  const row = (lb: { username: string; rating: number }[], n: string) => lb.find((e) => e.username === n)?.rating;
  ok("ranking da Partida Intensa tem a pontuação certa dos dois", row(lbClassic, nickA) === a4.classic && row(lbClassic, nickB) === b4.classic);
  ok("ranking da Partida Normal tem a pontuação certa dos dois", row(lbRapid, nickA) === a4.rapid && row(lbRapid, nickB) === b4.rapid);
  ok("ranking da Partida Rápida tem a pontuação certa dos dois", row(lbBlitz, nickA) === a4.blitz && row(lbBlitz, nickB) === b4.blitz);

  // O servidor confere o posicionamento pelo modo da sala.
  send(lobbyA, { type: "CreateRoom", matchType: "casual", pace: "blitz" });
  const small = (await next(lobbyA, (m) => m.type === "RoomCreated")) as any;
  const sRoomA = await connect(BASE + `/room/${small.roomId}/ws?playerId=${small.you.playerId}`);
  await waitFor(sRoomA, (m) => m.type === "RoomStateChanged");
  send(lobbyB, { type: "JoinRoom", roomId: small.roomId });
  const sJoin = (await next(lobbyB, (m) => m.type === "RoomJoined")) as any;
  const sRoomB = await connect(BASE + `/room/${small.roomId}/ws?playerId=${sJoin.you.playerId}`);
  await waitFor(sRoomB, (m) => m.type === "RoomStateChanged");
  await waitFor(sRoomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  send(sRoomA, { type: "PlayerReady" });
  send(sRoomB, { type: "PlayerReady" });
  await waitFor(sRoomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  const wrongSize = DeploymentManager.createDefaultPlayerDeployment(12, 18, "blue", formatFor("classic"));
  const rej = next(sRoomA, (m) => m.type === "ActionRejected");
  send(sRoomA, { type: "ConfirmDeployment", pieces: wrongSize });
  ok("sala da Partida Rápida recusa um posicionamento de 40 peças", /inválido/i.test(((await rej) as any).reason));
  sRoomA.close();
  sRoomB.close();

  lobbyA.close();
  lobbyB.close();
  console.log(fails ? `\n${fails} FALHA(S)` : "\nTUDO OK");
  process.exit(fails ? 1 : 0);
}

main().catch((err) => {
  console.error("FALHA:", err);
  process.exit(1);
});
