// Sprint QA-06 — rastreia exclusivamente o fluxo PlayerReady, replicando
// a MESMA condição que waiting-room.tsx usa para aceitar um
// RoomStateChanged: `event.roomId === flow.onlineRoomId` (o roomId
// curto guardado depois de RoomCreated/RoomJoined). Não corrige nada.
// Rode com: bun run scripts/test-qa06-ready.ts

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";
const buffers = new WeakMap<WebSocket, any[]>();

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const buffer: any[] = [];
    buffers.set(ws, buffer);
    ws.addEventListener("message", (ev: any) => {
      const msg = JSON.parse(ev.data);
      console.log("  <-", msg.type, JSON.stringify(msg).slice(0, 200));
      buffer.push(msg);
    });
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
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

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);

  console.log("== Setup: Login A + B, CreateRoom, JoinRoom ==");
  const wsA = await connect(BASE + "/connect");
  await waitFor(wsA, (m) => m.type === "PlayerConnected");
  wsA.send(JSON.stringify({ type: "Register", nickname: "qa06A_" + rand, email: "a@t.com", password: "senha1234" }));
  await waitFor(wsA, (m) => m.type === "AuthSuccess");

  wsA.send(JSON.stringify({ type: "CreateRoom" }));
  const created = await waitFor(wsA, (m) => m.type === "RoomCreated");
  const shortRoomId = created.roomId; // isto é o "flow.onlineRoomId" que a Interface guarda
  const playerIdA = created.you.playerId;
  console.log(`\n>>> flow.onlineRoomId (guardado pela Interface após RoomCreated) = "${shortRoomId}"\n`);

  const wsARoom = await connect(BASE + `/room/${shortRoomId}/ws?playerId=${playerIdA}`);
  const initialStateA = await waitFor(wsARoom, (m) => m.type === "RoomStateChanged");
  console.log(`\n>>> Primeiro RoomStateChanged recebido por A: roomId="${initialStateA.roomId}"`);
  console.log(`>>> Esse roomId bate com flow.onlineRoomId ("${shortRoomId}")? ${initialStateA.roomId === shortRoomId}\n`);

  const wsB = await connect(BASE + "/connect");
  await waitFor(wsB, (m) => m.type === "PlayerConnected");
  wsB.send(JSON.stringify({ type: "Register", nickname: "qa06B_" + rand, email: "b@t.com", password: "senha1234" }));
  await waitFor(wsB, (m) => m.type === "AuthSuccess");
  wsB.send(JSON.stringify({ type: "JoinRoom", roomId: shortRoomId }));
  const joined = await waitFor(wsB, (m) => m.type === "RoomJoined");
  const playerIdB = joined.you.playerId;

  const wsBRoom = await connect(BASE + `/room/${joined.roomId}/ws?playerId=${playerIdB}`);
  await waitFor(wsBRoom, (m) => m.type === "RoomStateChanged");
  await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.status === "ready");

  console.log("\n== 1. Clique em PRONTO (A) — enviando PlayerReady ==");
  wsARoom.send(JSON.stringify({ type: "PlayerReady" }));
  console.log('>>> Payload enviado por A: {"type":"PlayerReady"}');

  const afterReadyA = await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.readyPlayerIds.includes(playerIdA));
  console.log(`\n>>> RoomStateChanged após PRONTO de A: roomId="${afterReadyA.roomId}" readyPlayerIds=${JSON.stringify(afterReadyA.readyPlayerIds)}`);
  console.log(`>>> Esse roomId bate com flow.onlineRoomId da Interface ("${shortRoomId}")? ${afterReadyA.roomId === shortRoomId}`);
  console.log(">>> SE FALSE: a condição `event.roomId === flow.onlineRoomId` em waiting-room.tsx nunca é satisfeita — setStatus/setPlayers/setReadyIds NUNCA rodam para este evento.\n");

  console.log("== 1. Clique em PRONTO (B) — enviando PlayerReady ==");
  wsBRoom.send(JSON.stringify({ type: "PlayerReady" }));
  const afterReadyB = await waitFor(wsARoom, (m) => m.type === "RoomStateChanged" && m.status === "deployment");
  console.log(`\n>>> RoomStateChanged final (status=deployment) recebido por A: roomId="${afterReadyB.roomId}"`);
  console.log(`>>> Esse roomId bate com flow.onlineRoomId ("${shortRoomId}")? ${afterReadyB.roomId === shortRoomId}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
