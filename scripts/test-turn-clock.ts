// Relógio por jogada (docs/10-Multiplayer.md, "Relógio por Jogada"), contra o servidor LOCAL com o limite encurtado.
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787 --var TURN_LIMIT_MS:1500   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-turn-clock.ts

import { DeploymentManager } from "@/services/deploymentManager";
import { AIEngine } from "@/services/aiEngine";
import { formatFor } from "@/services/battleFormat";
import { getBlockedTiles, mapForPace } from "@/maps";
import type { GameState } from "@/types/gameState";
import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");
const LIMIT = Number(process.env.TURN_LIMIT_MS ?? 1500);

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
  send(ws, { type: "Register", nickname: nick, email: `${nick}@relogio.local`, password: "senha1234" });
  const reg = await take(ws, (m) => m.type === "VerificationRequired" || m.type === "AuthError");
  if (reg.type !== "VerificationRequired" || !reg.devCode) throw new Error("Cadastro: " + JSON.stringify(reg));
  send(ws, { type: "VerifyEmail", nickname: nick, code: reg.devCode });
  const done = await take(ws, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (done.type !== "AuthSuccess") throw new Error("Confirmação: " + JSON.stringify(done));
  return ws;
}

/** Cria uma sala com dois jogadores e começa a partida. Devolve os dois sockets de sala e o primeiro estado. */
async function startGame(tag: string) {
  const pace = "blitz" as const;
  const map = mapForPace(pace, "vale-blitz");
  const format = formatFor(pace);
  const blocked = getBlockedTiles(map);
  const lobbyA = await account(`rl_a_${tag}`);
  const lobbyB = await account(`rl_b_${tag}`);
  send(lobbyA, { type: "CreateRoom", pace, mapId: "vale-blitz" } as ClientEvent);
  const created = await take(lobbyA, (m) => m.type === "RoomCreated");
  const roomA = await connect(BASE + `/room/${created.roomId}/ws?playerId=${created.you.playerId}`);
  await take(roomA, (m) => m.type === "RoomStateChanged");
  send(lobbyB, { type: "JoinRoom", roomId: created.roomId });
  const joined = await take(lobbyB, (m) => m.type === "RoomJoined");
  const roomB = await connect(BASE + `/room/${created.roomId}/ws?playerId=${joined.you.playerId}`);
  await take(roomA, (m) => m.type === "RoomStateChanged" && m.status === "ready");
  send(roomA, { type: "PlayerReady" });
  send(roomB, { type: "PlayerReady" });
  await take(roomA, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  send(roomA, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "blue", format) });
  send(roomB, { type: "ConfirmDeployment", pieces: DeploymentManager.generateAIDeployment(map.rows, map.cols, blocked, "red", format) });
  const gsA = await take(roomA, (m) => m.type === "GameStarted");
  const gsB = await take(roomB, (m) => m.type === "GameStarted");
  return { roomA, roomB, gsA, gsB };
}

async function main() {
  const stamp = Date.now().toString(36);

  console.log("Relógio da vez");
  {
    const { roomA, roomB, gsA, gsB } = await startGame(`1${stamp}`);
    const now = Date.now();
    ok("o início da partida traz o prazo da vez", typeof gsA.turnDeadline === "number" && gsA.turnDeadline > now && gsA.turnDeadline - now <= LIMIT + 500);
    ok("os dois jogadores recebem o mesmo prazo", gsA.turnDeadline === gsB.turnDeadline);

    // Passar a vez com jogadas possíveis é recusado.
    send(roomA, { type: "EndTurn" });
    const rej = await take(roomA, (m) => m.type === "ActionRejected");
    ok(`passar a vez tendo jogadas é recusado ("${rej.reason}")`, /jogadas poss/i.test(rej.reason));

    // Azul não joga: o relógio zera e a vez passa para o vermelho.
    const t0 = Date.now();
    const evA = await take(roomA, (m) => m.type === "ActionApplied", LIMIT + 5000);
    const evB = await take(roomB, (m) => m.type === "ActionApplied", LIMIT + 5000);
    ok(`sem jogar, a vez passa sozinha depois do limite (${Date.now() - t0} ms)`, evA.state.currentPlayer === "RED" && evB.state.currentPlayer === "RED");
    ok("a jogada automática não mexe nas peças (só passa a vez)", JSON.stringify(evA.state.pieces.map((p: any) => [p.currentRow, p.currentColumn])) === JSON.stringify(gsA.state.pieces.map((p: any) => [p.currentRow, p.currentColumn])));
    ok("o novo prazo é do vermelho e vem no evento", typeof evA.turnDeadline === "number" && evA.turnDeadline > Date.now());

    // O vermelho joga a tempo: o prazo passa para o azul.
    const view = hydrate(evB.state);
    const d = AIEngine.chooseMove(view, "RED", { memoryKey: `rl-${stamp}-r1` })!;
    send(roomB, { type: "MovePiece", pieceId: d.piece.id, row: d.target.row, column: d.target.column });
    const back = await take(roomA, (m) => m.type === "ActionApplied");
    ok("jogando a tempo, a vez volta ao azul com novo prazo", back.state.currentPlayer === "BLUE" && typeof back.turnDeadline === "number");
    roomA.close();
    roomB.close();
  }

  console.log("Três vezes seguidas sem jogar");
  {
    const { roomA, roomB } = await startGame(`2${stamp}`);
    let timeouts = 0;
    let finished: any = null;
    let lastB: any = null;
    const t0 = Date.now();
    while (!finished && Date.now() - t0 < 30000) {
      // Vermelho joga sempre a tempo; azul nunca joga.
      const evB = await take(roomB, (m) => m.type === "ActionApplied" || m.type === "GameFinished", LIMIT * 3 + 4000);
      if (evB.type === "GameFinished") {
        finished = evB;
        break;
      }
      lastB = evB;
      if (evB.appliedBy && evB.state.currentPlayer === "RED") {
        timeouts++;
        const view = hydrate(evB.state);
        const d = AIEngine.chooseMove(view, "RED", { memoryKey: `rl-${stamp}-r2` });
        send(roomB, d ? { type: "MovePiece", pieceId: d.piece.id, row: d.target.row, column: d.target.column } : { type: "EndTurn" });
      }
    }
    void lastB;
    ok(`o azul perdeu a partida na 3ª vez sem jogar (vezes perdidas antes: ${timeouts})`, !!finished && finished.winner === "RED" && timeouts === 2);
    ok("o fim é por abandono (W.O.), não por captura", !!finished && finished.reason === "forfeit");
    roomA.close();
    roomB.close();
  }

  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
