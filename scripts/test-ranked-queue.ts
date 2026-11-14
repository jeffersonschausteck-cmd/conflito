// Busca de partida ranqueada (docs/10-Multiplayer.md, docs/16): fila por modo, cancelar, conta que não joga contra si
// mesma, adversário do computador depois do prazo, pontos/histórico/ranking atualizados e aprendizado da IA.
// Servidor LOCAL (wrangler dev) com prazo curto. Nunca roda em produção.
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787 --var MATCH_BOT_AFTER_MS:4000 --persist-to ../../.wr-test-state
// Rode com: bun run scripts/test-ranked-queue.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { AIEngine } from "@/services/aiEngine";
import { formatFor } from "@/services/battleFormat";
import { getBlockedTiles, mapForPace, mapsForPace } from "@/maps";
import type { GameState, Pace } from "@/types/gameState";
import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");
const HTTP = BASE.replace(/^ws/, "http");

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
    }, 20);
  });
}
const waitFor = (ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 10000) => {
  const have = buffers.get(ws)!.find(pred);
  return have ? Promise.resolve(have) : next(ws, pred, timeoutMs);
};
/** Espera `ms` e diz se chegou algum evento que satisfaça o predicado. */
async function never(ws: WebSocket, pred: (m: ServerEvent) => boolean, ms: number): Promise<boolean> {
  try {
    await next(ws, pred, ms);
    return false;
  } catch {
    return true;
  }
}
const hydrate = (s: any): GameState => ({ ...s, config: { ...s.config, blockedTiles: new Set<string>(s.config.blockedTiles) } });

interface Acc {
  lobby: WebSocket;
  nick: string;
  token: string;
}
async function account(nick: string): Promise<Acc> {
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
  return { lobby: ws, nick, token: done.token };
}
/** Outra conexão da mesma conta (por exemplo, uma segunda aba). */
async function resume(acc: Acc): Promise<WebSocket> {
  const ws = await connect(BASE + "/connect");
  await waitFor(ws, (m) => m.type === "PlayerConnected");
  send(ws, { type: "ResumeSession", token: acc.token });
  await new Promise((r) => setTimeout(r, 300));
  return ws;
}

async function enterRoom(ev: any) {
  return connect(BASE + `/room/${ev.roomId}/ws?playerId=${ev.you.playerId}`);
}

/** Joga a partida inteira como "jogador humano" com a IA, pelo protocolo; o outro lado joga sozinho (computador) ou por outro driver. */
async function playSide(room: WebSocket, owner: "blue" | "red", pace: Pace, mapId: string, deadlineMs = 240_000): Promise<GameState> {
  const map = mapForPace(pace, mapId);
  const format = formatFor(pace);
  send(room, { type: "PlayerReady" });
  await waitFor(room, (m) => m.type === "RoomStateChanged" && m.status === "deployment", 15000);
  send(room, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, getBlockedTiles(map), owner, format) });
  const started = (await waitFor(room, (m) => m.type === "GameStarted", 20000)) as any;
  let state = hydrate(started.state);
  const t0 = Date.now();
  let sentForTurn = -1;
  const mine = owner === "blue" ? "BLUE" : "RED";
  const buf = buffers.get(room)!;
  let seen = buf.length;
  while (!state.gameOver && Date.now() - t0 < deadlineMs) {
    if (state.currentPlayer === mine && sentForTurn !== state.turnNumber) {
      sentForTurn = state.turnNumber;
      const d = AIEngine.chooseMove(state, state.currentPlayer, { memoryKey: `test-${owner}-${started.matchStartTime}` });
      if (d) send(room, { type: "MovePiece", pieceId: d.piece.id, row: d.target.row, column: d.target.column });
      else send(room, { type: "EndTurn" });
    }
    await new Promise((r) => setTimeout(r, 15));
    for (; seen < buf.length; seen++) {
      const ev = buf[seen] as any;
      if (ev.state && (ev.type === "ActionApplied" || ev.type === "GameFinished" || ev.type === "GameStarted")) state = hydrate(ev.state);
      if (ev.type === "ActionRejected") sentForTurn = -1; // tenta de novo no próximo ciclo
    }
  }
  return state;
}

async function main() {
  const stamp = Date.now().toString(36);
  const pace: Pace = "blitz";

  // ── 1. Fila: duas contas diferentes são pareadas ──
  console.log("Fila e pareamento");
  const a = await account(`fila_a_${stamp}`);
  const b = await account(`fila_b_${stamp}`);
  send(a.lobby, { type: "FindRankedMatch", pace });
  const started = (await next(a.lobby, (m) => m.type === "MatchSearchStarted")) as any;
  ok("a busca começa e informa o prazo", started.pace === pace && started.deadline > Date.now());
  const aRoom = next(a.lobby, (m) => m.type === "RoomCreated");
  send(b.lobby, { type: "FindRankedMatch", pace });
  const created = (await aRoom) as any;
  const joined = (await waitFor(b.lobby, (m) => m.type === "RoomJoined")) as any;
  ok("os dois vão para a mesma sala", created.roomId === joined.roomId && joined.players.length === 2);
  ok("o mapa é um dos 5 do modo", mapsForPace(pace).some((m) => m.id === created.mapId) && created.mapId === joined.mapId);
  ok("o modo da sala é o buscado", created.pace === pace);
  const humanMap = created.mapId as string;

  // ── 2. Mesma conta nunca pareia consigo mesma ──
  console.log("\nMesma conta e cancelamento");
  const c = await account(`fila_c_${stamp}`);
  send(c.lobby, { type: "FindRankedMatch", pace });
  await next(c.lobby, (m) => m.type === "MatchSearchStarted");
  const c2 = await resume(c);
  send(c2, { type: "FindRankedMatch", pace });
  await next(c2, (m) => m.type === "MatchSearchStarted");
  ok("a mesma conta em duas abas não forma partida consigo mesma", await never(c2, (m) => m.type === "RoomCreated" || m.type === "RoomJoined", 1200));
  send(c2, { type: "CancelFindMatch" });
  ok("cancelar avisa e tira da fila", ((await next(c2, (m) => m.type === "MatchSearchCancelled")) as any).type === "MatchSearchCancelled");
  const d = await account(`fila_d_${stamp}`);
  send(d.lobby, { type: "FindRankedMatch", pace });
  await next(d.lobby, (m) => m.type === "MatchSearchStarted");
  ok("quem cancelou não é pareado depois", await never(d.lobby, (m) => m.type === "RoomJoined" || m.type === "RoomCreated", 1000));
  send(d.lobby, { type: "CancelFindMatch" });
  await next(d.lobby, (m) => m.type === "MatchSearchCancelled");

  // ── 3. Entrar na própria sala com a mesma conta é recusado ──
  console.log("\nMesma conta na mesma sala");
  send(c.lobby, { type: "CreateRoom", pace } as ClientEvent);
  const own = (await next(c.lobby, (m) => m.type === "RoomCreated")) as any;
  send(c2, { type: "JoinRoom", roomId: own.roomId });
  const rej = (await next(c2, (m) => m.type === "ActionRejected" || m.type === "RoomJoined")) as any;
  ok("a mesma conta não entra na própria sala", rej.type === "ActionRejected");

  // ── 4. Partida entre duas pessoas: pontos, histórico, ranking e aprendizado ──
  console.log("\nPartida entre duas pessoas");
  const roomA = await enterRoom(created);
  const roomB = await enterRoom(joined);
  await waitFor(roomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  const [stA, stB] = await Promise.all([playSide(roomA, created.you.owner, pace, humanMap), playSide(roomB, joined.you.owner, pace, humanMap)]);
  ok("a partida entre as duas contas termina", stA.gameOver && !!stA.winner && stB.gameOver);
  const finA = (await waitFor(roomA, (m) => m.type === "GameFinished")) as any;
  const finB = (await waitFor(roomB, (m) => m.type === "GameFinished")) as any;
  ok("os dois recebem o resultado ranqueado", finA.ranking?.matchType === "ranked" && finB.ranking?.matchType === "ranked");
  ok("pontos: vencedor sobe e perdedor desce", finA.ranking.ratingDelta + finB.ranking.ratingDelta === 0 && finA.ranking.ratingDelta !== 0);
  for (const [acc, fin] of [[a, finA], [b, finB]] as const) {
    send(acc.lobby, { type: "GetMyStats", pace });
    const stats = (await next(acc.lobby, (m) => m.type === "MyStatsData")) as any;
    ok(`${acc.nick.slice(0, 6)}: estatísticas do modo mudaram (${stats.stats?.rating})`, stats.stats?.rankedMatches === 1 && stats.stats.rating === fin.ranking.ratingAfter);
    send(acc.lobby, { type: "GetMatchHistory", limit: 5 });
    const hist = (await next(acc.lobby, (m) => m.type === "MatchHistoryData")) as any;
    ok(`${acc.nick.slice(0, 6)}: histórico tem a partida`, hist.matches.length === 1 && hist.matches[0].matchType === "ranked");
    send(acc.lobby, { type: "GetLeaderboard", limit: 50, pace });
    const lb = (await next(acc.lobby, (m) => m.type === "LeaderboardData")) as any;
    ok(`${acc.nick.slice(0, 6)}: aparece no ranking do modo`, lb.entries.some((e: any) => e.username === acc.nick));
  }
  const learning1 = (await (await fetch(`${HTTP}/learning/${pace}`)).json()) as any;
  ok("o aprendizado guardou a partida entre pessoas", learning1.games >= 2 && learning1.layouts.length >= 1);
  ok("o aprendizado não guarda nomes nem contas", !/fila_|accountId|nickname|username/i.test(JSON.stringify(learning1)));
  roomA.close();
  roomB.close();

  // ── 5. Sem adversário: partida contra o computador, com nome sorteado ──
  console.log("\nSem adversário: o computador entra");
  const e = await account(`fila_e_${stamp}`);
  const t0 = Date.now();
  send(e.lobby, { type: "FindRankedMatch", pace });
  await next(e.lobby, (m) => m.type === "MatchSearchStarted");
  const botRoom = (await next(e.lobby, (m) => m.type === "RoomCreated" || m.type === "RoomJoined", 15000)) as any;
  ok(`depois do prazo a partida é criada (${Math.round((Date.now() - t0) / 100) / 10} s)`, Date.now() - t0 >= 3000);
  const room = await enterRoom(botRoom);
  const roomState = (await waitFor(room, (m) => m.type === "RoomStateChanged")) as any;
  const opp = (roomState.players as any[]).find((p) => p.playerId !== botRoom.you.playerId);
  ok("há um adversário com nome de usuário sorteado", !!opp && typeof opp.playerName === "string" && opp.playerName.length >= 4 && !/bot|computador/i.test(opp.playerName));
  ok("o adversário já está pronto", roomState.readyPlayerIds.includes(opp.playerId));
  const fin = await playSide(room, botRoom.you.owner, pace, botRoom.mapId, 300_000);
  ok("a partida contra o computador termina com vencedor", fin.gameOver && !!fin.winner);
  const botFin = (await waitFor(room, (m) => m.type === "GameFinished", 20000)) as any;
  ok("vale pontos como ranqueada", botFin.ranking?.matchType === "ranked" && typeof botFin.ranking.ratingAfter === "number");
  send(e.lobby, { type: "GetMyStats", pace });
  const eStats = (await next(e.lobby, (m) => m.type === "MyStatsData")) as any;
  ok("pontuação, partidas e vitórias/derrotas atualizadas", eStats.stats.rankedMatches === 1 && eStats.stats.wins + eStats.stats.losses === 1 && eStats.stats.rating === botFin.ranking.ratingAfter);
  send(e.lobby, { type: "GetMatchHistory", limit: 5 });
  const eHist = (await next(e.lobby, (m) => m.type === "MatchHistoryData")) as any;
  ok("o histórico mostra o nome sorteado do adversário", eHist.matches.length === 1 && eHist.matches[0].opponentNickname === opp.playerName);
  send(e.lobby, { type: "GetLeaderboard", limit: 50, pace });
  const eLb = (await next(e.lobby, (m) => m.type === "LeaderboardData")) as any;
  ok("o jogador aparece no ranking e o computador não", eLb.entries.some((x: any) => x.username === e.nick) && !eLb.entries.some((x: any) => x.username === opp.playerName));
  const learning2 = (await (await fetch(`${HTTP}/learning/${pace}`)).json()) as any;
  ok("partida contra o computador não alimenta o aprendizado", learning2.games === learning1.games);

  // ── 6. Revanche contra o computador ──
  console.log("\nRevanche contra o computador");
  const dep = next(room, (m) => m.type === "RoomStateChanged" && m.status === "deployment", 10000);
  send(room, { type: "Rematch" });
  const re = (await dep) as any;
  ok("o computador aceita a revanche e a sala volta ao Posicionamento", re.status === "deployment" && re.deployedPlayerIds.length === 1);
  room.close();

  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no teste:", e);
  process.exit(1);
});
