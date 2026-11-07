// Sprint QA-05 — validação final: fluxo completo com o código da sala
// em MAIÚSCULAS (exatamente como a Interface exibe), confirmando que
// os dois jogadores acabam na MESMA Waiting Room e aparecem
// conectados um para o outro.
// Rode com: bun run scripts/test-qa05-final.ts

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}

const buffers = new WeakMap<WebSocket, any[]>();
function connectBuffered(url: string): Promise<WebSocket> {
  return connect(url).then((ws) => {
    const buffer: any[] = [];
    buffers.set(ws, buffer);
    ws.addEventListener("message", (ev: any) => buffer.push(JSON.parse(ev.data)));
    return ws;
  });
}

function waitFor(ws: WebSocket, predicate: (m: any) => boolean, timeoutMs = 8000): Promise<any> {
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
    }, 50);
  });
}

function ok(label: string) {
  console.log(`  ✔ ${label}`);
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);

  console.log("== Jogador A: Login + Criar Sala ==");
  const wsA = await connectBuffered(BASE + "/connect");
  await waitFor(wsA, (m) => m.type === "PlayerConnected");
  wsA.send(JSON.stringify({ type: "Register", nickname: "qa05A_" + rand, email: "qa5a@test.com", password: "senha1234" }));
  const authA = await waitFor(wsA, (m) => m.type === "AuthSuccess");
  ok("Login A");

  wsA.send(JSON.stringify({ type: "CreateRoom" }));
  const created = await waitFor(wsA, (m) => m.type === "RoomCreated");
  const roomIdRaw = created.roomId;
  const roomIdOnScreen = roomIdRaw.toUpperCase();
  ok(`Sala criada: ${roomIdRaw} (exibida como "SALA ${roomIdOnScreen}")`);
  const playerIdA = created.you.playerId;

  const wsARoom = await connectBuffered(BASE + `/room/${roomIdRaw}/ws?playerId=${playerIdA}`);
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged");

  console.log("== Jogador B: Login + Entrar na Sala com o código EM MAIÚSCULAS ==");
  const wsB = await connectBuffered(BASE + "/connect");
  await waitFor(wsB, (m) => m.type === "PlayerConnected");
  wsB.send(JSON.stringify({ type: "Register", nickname: "qa05B_" + rand, email: "qa5b@test.com", password: "senha1234" }));
  await waitFor(wsB, (m) => m.type === "AuthSuccess");
  ok("Login B");

  wsB.send(JSON.stringify({ type: "JoinRoom", roomId: roomIdOnScreen }));
  const joined = await waitFor(wsB, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");
  if (joined.type !== "RoomJoined") throw new Error("JoinRoom falhou: " + joined.reason);
  ok(`✓ Sala encontrada — B entrou usando "${roomIdOnScreen}" (roomId normalizado: ${joined.roomId})`);
  const playerIdB = joined.you.playerId;

  const wsBRoom = await connectBuffered(BASE + `/room/${joined.roomId}/ws?playerId=${playerIdB}`);
  await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged");

  console.log("== Confirmando que ambos estão na MESMA Waiting Room, conectados ==");
  const stateOnA = await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.players.length === 2);
  const stateOnB = await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged" && m.players.length === 2);

  if (stateOnA.roomId !== stateOnB.roomId) throw new Error("A e B estão em salas diferentes!");
  ok(`✓ Ambos na mesma Waiting Room (roomId=${stateOnA.roomId})`);

  const ownersOnA = stateOnA.players.map((p: any) => `${p.playerName}(${p.owner})`).sort();
  const ownersOnB = stateOnB.players.map((p: any) => `${p.playerName}(${p.owner})`).sort();
  if (JSON.stringify(ownersOnA) !== JSON.stringify(ownersOnB)) throw new Error("Lista de jogadores diverge entre A e B!");
  ok(`✓ Ambos aparecem conectados para os dois lados: ${ownersOnA.join(", ")}`);

  console.log("\nALL QA-05 CHECKS PASSED");
  wsA.close();
  wsARoom.close();
  wsB.close();
  wsBRoom.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("FALHA:", err);
  process.exit(1);
});
