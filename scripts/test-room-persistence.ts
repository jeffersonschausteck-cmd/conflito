// Diagnóstico dedicado (Sprint QA-03) — isola se "Sala não encontrada"
// vem de perda de estado no AccountsRoom (eviction da Durable Object)
// usando conexões totalmente independentes (sem reaproveitar nenhum
// singleton de cliente), com um atraso deliberado entre CreateRoom e
// JoinRoom. Rode com: bun run scripts/test-room-persistence.ts

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";
const DELAY_MS = Number(process.env.DELAY_MS ?? 8000);

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e: any) => reject(e));
  });
}

function waitFor(ws: WebSocket, predicate: (m: any) => boolean, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    const handler = (ev: any) => {
      const msg = JSON.parse(ev.data);
      console.log("  <-", msg.type, JSON.stringify(msg).slice(0, 150));
      if (predicate(msg)) {
        clearTimeout(t);
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);

  console.log("== Jogador A: conexão independente #1 — Login ==");
  const wsA = await connect(BASE + "/connect");
  await waitFor(wsA, (m) => m.type === "PlayerConnected");
  wsA.send(JSON.stringify({ type: "Register", nickname: "persistA_" + rand, email: "pa@test.com", password: "senha1234" }));
  const authA = await waitFor(wsA, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (authA.type !== "AuthSuccess") throw new Error("Falha no cadastro/login de A: " + authA.reason);
  console.log("Login A OK.");

  console.log("== Jogador A: CreateRoom ==");
  wsA.send(JSON.stringify({ type: "CreateRoom" }));
  const created = await waitFor(wsA, (m) => m.type === "RoomCreated" || m.type === "ActionRejected");
  if (created.type !== "RoomCreated") throw new Error("CreateRoom falhou: " + created.reason);
  const roomId = created.roomId;
  console.log(`Sala criada: ${roomId}`);

  // Fecha a conexão de A com a AccountsRoom (o cliente real também faz
  // isso — NetworkClient.reconnectToRoom troca para a GameRoom logo após
  // RoomCreated). Isso é DELIBERADO: queremos saber se a AccountsRoom
  // sobrevive sem NENHUMA conexão ativa por alguns segundos.
  wsA.close();
  console.log(`AccountsRoom agora sem nenhuma conexão ativa. Aguardando ${DELAY_MS}ms...`);
  await sleep(DELAY_MS);

  console.log("== Jogador B: conexão independente #2 (nova, do zero) — Login ==");
  const wsB = await connect(BASE + "/connect");
  await waitFor(wsB, (m) => m.type === "PlayerConnected");
  wsB.send(JSON.stringify({ type: "Register", nickname: "persistB_" + rand, email: "pb@test.com", password: "senha1234" }));
  const authB = await waitFor(wsB, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (authB.type !== "AuthSuccess") throw new Error("Falha no cadastro/login de B: " + authB.reason);
  console.log("Login B OK.");

  console.log(`== Jogador B: JoinRoom(${roomId}) após ${DELAY_MS}ms sem conexões na AccountsRoom ==`);
  wsB.send(JSON.stringify({ type: "JoinRoom", roomId }));
  const joined = await waitFor(wsB, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");

  if (joined.type === "ActionRejected") {
    console.log(`\n❌ REPRODUZIDO: "${joined.reason}" — a sala (ou a sessão) NÃO sobreviveu ao período sem conexões.`);
    process.exit(2);
  }

  console.log("\n✅ NÃO reproduzido nestas condições — a sala sobreviveu ao período sem conexões ativas.");
  wsA.close();
  wsB.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
