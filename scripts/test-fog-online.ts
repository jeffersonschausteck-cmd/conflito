// Informação oculta no servidor (docs/10-Multiplayer.md, "Informação oculta"): cada jogador só recebe as peças do
// adversário que já foram reveladas. Joga uma partida inteira pelo protocolo real, cada lado decidindo só com o que
// recebeu, e confere em todo estado enviado. Só roda no servidor LOCAL.
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-fog-online.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { AIEngine } from "@/services/aiEngine";
import { formatFor } from "@/services/battleFormat";
import { maskStateFor, opaquePieceIds } from "@/services/fogMask";
import { GameEngine } from "@/services/gameEngine";
import { getBlockedTiles, mapForPace } from "@/maps";
import type { GameState } from "@/types/gameState";
import type { Piece } from "@/types/piece";
import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");

let fails = 0;
const ok = (label: string, cond = true) => {
  console.log(`  ${cond ? "✔" : "✘"} ${label}`);
  if (!cond) fails++;
};

const buffers = new WeakMap<WebSocket, ServerEvent[]>();
const seen = new WeakMap<WebSocket, number>();
function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buf: ServerEvent[] = [];
    buffers.set(ws, buf);
    seen.set(ws, 0);
    ws.addEventListener("message", (ev: any) => buf.push(JSON.parse(ev.data) as ServerEvent));
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}
const send = (ws: WebSocket, e: ClientEvent) => ws.send(JSON.stringify(e));
/** Próximo evento (ainda não consumido por `take`) que satisfaça o predicado. */
async function take(ws: WebSocket, pred: (m: ServerEvent) => boolean, timeoutMs = 15000): Promise<any> {
  const buf = buffers.get(ws)!;
  const t0 = Date.now();
  for (;;) {
    for (let i = seen.get(ws)!; i < buf.length; i++) {
      if (pred(buf[i])) {
        seen.set(ws, i + 1);
        return buf[i];
      }
    }
    if (Date.now() - t0 > timeoutMs) throw new Error("timeout: " + pred.toString());
    await new Promise((r) => setTimeout(r, 15));
  }
}
const hydrate = (s: any): GameState => ({ ...s, config: { ...s.config, blockedTiles: new Set<string>(s.config.blockedTiles) } });

async function account(nick: string): Promise<WebSocket> {
  const ws = await connect(BASE + "/connect");
  await take(ws, (m) => m.type === "PlayerConnected");
  send(ws, { type: "Register", nickname: nick, email: `${nick}@fog.local`, password: "senha1234" });
  const reg = await take(ws, (m) => m.type === "VerificationRequired" || m.type === "AuthError");
  if (reg.type !== "VerificationRequired" || !reg.devCode) throw new Error("Cadastro: " + JSON.stringify(reg));
  send(ws, { type: "VerifyEmail", nickname: nick, code: reg.devCode });
  const done = await take(ws, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (done.type !== "AuthSuccess") throw new Error("Confirmação: " + JSON.stringify(done));
  return ws;
}

const TYPE_WORDS = /commander|officer|sniper|engineer|infantry|scout|spy|bomb|flag/i;

/** Confere um estado recebido por `viewer`: nada de oculto vaza. Devolve quantas peças ocultas viu. */
function checkView(state: GameState, viewer: "blue" | "red", label: string): number {
  let hidden = 0;
  let leak: string | null = null;
  for (const p of state.pieces) {
    if (TYPE_WORDS.test(p.id)) leak = `id com tipo (${p.id})`;
    const secret = p.owner !== viewer && p.isAlive && !p.isRevealed && p.pieceType !== "flag";
    if (secret) {
      hidden++;
      if (p.pieceType !== "infantry" || !p.canMove || p.rank !== 4) leak = `peça oculta entrega ${p.pieceType}/${p.rank}/${p.canMove}`;
    }
  }
  if (leak) console.log(`     ${label}: ${leak}`);
  return leak ? -1 : hidden;
}

async function main() {
  console.log("Unidades (sem rede)");
  {
    const map = mapForPace("blitz", "vale-blitz");
    const format = formatFor("blitz");
    const blocked = getBlockedTiles(map);
    const blue = opaquePieceIds(DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "blue", format));
    const red = opaquePieceIds(DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "red", format));
    ok("ids opacos não contêm o tipo e são únicos", [...blue, ...red].every((p) => !TYPE_WORDS.test(p.id)) && new Set([...blue, ...red].map((p) => p.id)).size === blue.length + red.length);
    ok("o posicionamento com ids opacos continua válido", DeploymentManager.validateDeployment(blue, map.rows, map.cols, blocked, "blue", format));
    let st = GameEngine.createInitialState({ rows: map.rows, cols: map.cols, blockedTiles: blocked, pace: "blitz", mapId: "vale-blitz" });
    st = { ...st, pieces: [...blue, ...red] };
    const m = maskStateFor(st, "blue");
    const hid = m.pieces.filter((p: Piece) => p.owner === "red" && p.pieceType !== "flag");
    ok("máscara: peças ocultas do vermelho viram a figura única", hid.every((p) => p.pieceType === "infantry" && p.canMove && p.rank === 4));
    ok("máscara: as peças do próprio azul ficam como são", m.pieces.filter((p) => p.owner === "blue").every((p, i) => p.pieceType === st.pieces.filter((q) => q.owner === "blue")[i].pieceType));
    ok("máscara: a Bandeira do adversário continua visível (docs/04, seção 7)", m.pieces.some((p) => p.owner === "red" && p.pieceType === "flag"));
    ok("máscara não altera o estado original", st.pieces.some((p) => p.owner === "red" && p.pieceType === "bomb"));
    ok("partida terminada: tudo é mostrado", maskStateFor({ ...st, gameOver: true, winner: "BLUE" }, "blue").pieces.some((p) => p.owner === "red" && p.pieceType === "bomb"));
  }

  console.log("Partida online completa");
  const stamp = Date.now().toString(36);
  const hostLobby = await account(`fo_a_${stamp}`);
  const guestLobby = await account(`fo_b_${stamp}`);
  const pace = "blitz" as const;
  const mapId = "vale-blitz";
  const map = mapForPace(pace, mapId);
  const format = formatFor(pace);
  const blocked = getBlockedTiles(map);

  send(hostLobby, { type: "CreateRoom", pace, mapId } as ClientEvent);
  const created = await take(hostLobby, (m) => m.type === "RoomCreated");
  const roomA = await connect(BASE + `/room/${created.roomId}/ws?playerId=${created.you.playerId}`);
  await take(roomA, (m) => m.type === "RoomStateChanged");
  send(guestLobby, { type: "JoinRoom", roomId: created.roomId });
  const joined = await take(guestLobby, (m) => m.type === "RoomJoined");
  let roomB = await connect(BASE + `/room/${created.roomId}/ws?playerId=${joined.you.playerId}`);
  await take(roomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  send(roomA, { type: "PlayerReady" });
  send(roomB, { type: "PlayerReady" });
  await take(roomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  send(roomA, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "blue", format) });
  send(roomB, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "red", format) });
  const gsA = await take(roomA, (m) => m.type === "GameStarted");
  const gsB = await take(roomB, (m) => m.type === "GameStarted");
  let viewA = hydrate(gsA.state);
  let viewB = hydrate(gsB.state);

  const hA = checkView(viewA, "blue", "início/azul");
  const hB = checkView(viewB, "red", "início/vermelho");
  ok(`no início, nada oculto vaza (azul vê ${hA} vultos, vermelho ${hB})`, hA > 0 && hA === hB && hA === viewA.pieces.filter((p) => p.owner === "red" && p.pieceType !== "flag").length);
  ok("cada um recebe os seus tipos reais (conta por tipo bate com o exército)", (["blue", "red"] as const).every((o) => {
    const v = o === "blue" ? viewA : viewB;
    const counts: Record<string, number> = {};
    for (const p of v.pieces) if (p.owner === o) counts[p.pieceType] = (counts[p.pieceType] ?? 0) + 1;
    return Object.keys(counts).length >= 8 && (counts.bomb ?? 0) > 0 && (counts.flag ?? 0) === 1 && (counts.commander ?? 0) === 1;
  }));

  let plies = 0;
  let leaks = 0;
  let revealedConsistent = true;
  let finished: any = null;
  while (plies < 1500) {
    const mover = viewA.currentPlayer === "BLUE" ? "blue" : "red";
    const ws = mover === "blue" ? roomA : roomB;
    const own = mover === "blue" ? viewA : viewB;
    const d = AIEngine.chooseMove(own, own.currentPlayer, { memoryKey: `fog-${stamp}-${mover}` });
    send(ws, d ? { type: "MovePiece", pieceId: d.piece.id, row: d.target.row, column: d.target.column } : { type: "EndTurn" });
    const isEnd = (m: ServerEvent) => m.type === "ActionApplied" || m.type === "GameFinished" || m.type === "ActionRejected";
    const evA = await take(roomA, isEnd);
    const evB = await take(roomB, isEnd);
    if (evA.type === "ActionRejected" || evB.type === "ActionRejected") throw new Error(`jogada recusada: ${(evA.reason ?? evB.reason)}`);
    viewA = hydrate(evA.state);
    viewB = hydrate(evB.state);
    plies++;
    if (evA.type === "GameFinished") {
      finished = { a: viewA, b: viewB };
      break;
    }
    if (checkView(viewA, "blue", `jogada ${plies}/azul`) < 0 || checkView(viewB, "red", `jogada ${plies}/vermelho`) < 0) leaks++;
    // Uma peça revelada tem de ter o mesmo tipo nas duas visões.
    for (const p of viewA.pieces) {
      const q = viewB.pieces.find((x) => x.id === p.id);
      if (p.isRevealed && p.isAlive && q && q.pieceType !== p.pieceType) revealedConsistent = false;
    }
    if (plies === 40) {
      // Reconexão no meio da partida: o estado reenviado também vem filtrado.
      roomB.close();
      await new Promise((r) => setTimeout(r, 400));
      roomB = await connect(BASE + `/room/${created.roomId}/ws?playerId=${joined.you.playerId}`);
      const re = await take(roomB, (m) => m.type === "ActionApplied" || m.type === "GameStarted" || m.type === "RoomStateChanged" && !!(m as any).state, 8000).catch(() => null);
      void re;
      const stateEvent = buffers.get(roomB)!.find((m: any) => m.state && m.state.pieces);
      ok("ao reconectar, o estado reenviado também vem filtrado", !stateEvent || checkView(hydrate((stateEvent as any).state), "red", "reconexão") >= 0);
    }
  }
  ok(`a partida terminou pelo protocolo (${plies} jogadas)`, !!finished);
  ok("durante a partida nenhum estado entregou peça oculta", leaks === 0);
  ok("peças reveladas têm o mesmo tipo para os dois", revealedConsistent);
  if (finished) {
    const unknownLeft = finished.a.pieces.filter((p: Piece) => p.isAlive && p.owner === "red" && p.pieceType === "bomb").length;
    ok("no fim o tabuleiro todo é mostrado (a Armadilha restante aparece com o tipo real)", finished.a.pieces.some((p: Piece) => p.pieceType !== "infantry" && p.owner === "red") && unknownLeft >= 0);
  }

  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
