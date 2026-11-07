// Sprint QA-04 — reproduz o fluxo EXATO de um usuário real: Jogador A
// cria a sala; Jogador B copia o código exatamente como aparece na
// tela da Sala de Espera (`SALA ${roomId.toUpperCase()}` — ver
// waiting-room.tsx), e digita esse valor (maiúsculo) no campo "Código
// da sala". Não corrige nada — só observa onde falha.
// Rode com: bun run scripts/test-real-user-flow.ts

const BASE = process.env.WORKER_URL ?? "wss://conflito-multiplayer.jefinhoschaus50.workers.dev";

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

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);

  console.log("== Jogador A: Login + Criar Sala ==");
  const wsA = await connect(BASE + "/connect");
  await waitFor(wsA, (m) => m.type === "PlayerConnected");
  wsA.send(JSON.stringify({ type: "Register", nickname: "realuserA_" + rand, email: "rua@test.com", password: "senha1234" }));
  const authA = await waitFor(wsA, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (authA.type !== "AuthSuccess") throw new Error("Login A falhou: " + authA.reason);

  wsA.send(JSON.stringify({ type: "CreateRoom" }));
  const created = await waitFor(wsA, (m) => m.type === "RoomCreated" || m.type === "ActionRejected");
  if (created.type !== "RoomCreated") throw new Error("CreateRoom falhou: " + created.reason);
  const roomIdRaw = created.roomId;
  const roomIdAsDisplayedOnScreen = roomIdRaw.toUpperCase(); // exatamente como waiting-room.tsx mostra
  console.log(`Sala criada (bruto, minúsculo): "${roomIdRaw}"`);
  console.log(`Como aparece na tela (SALA ${roomIdAsDisplayedOnScreen}): "${roomIdAsDisplayedOnScreen}"`);

  console.log("\n== Jogador B: Login + Entrar na Sala usando o código EXATAMENTE como está na tela (maiúsculo) ==");
  const wsB = await connect(BASE + "/connect");
  await waitFor(wsB, (m) => m.type === "PlayerConnected");
  wsB.send(JSON.stringify({ type: "Register", nickname: "realuserB_" + rand, email: "rub@test.com", password: "senha1234" }));
  const authB = await waitFor(wsB, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (authB.type !== "AuthSuccess") throw new Error("Login B falhou: " + authB.reason);

  console.log(`Jogador B digita: "${roomIdAsDisplayedOnScreen}"`);
  wsB.send(JSON.stringify({ type: "JoinRoom", roomId: roomIdAsDisplayedOnScreen }));
  const joined = await waitFor(wsB, (m) => m.type === "RoomJoined" || m.type === "ActionRejected");

  if (joined.type === "ActionRejected") {
    console.log(`\n❌ REPRODUZIDO: "${joined.reason}"`);
    console.log(`roomId criado (bruto):        "${roomIdRaw}"`);
    console.log(`roomId digitado por B (tela): "${roomIdAsDisplayedOnScreen}"`);
    console.log(`São iguais (===)? ${roomIdRaw === roomIdAsDisplayedOnScreen}`);
    process.exit(2);
  }

  console.log("\n✅ NÃO reproduzido — JoinRoom com o código em maiúsculo funcionou.");
  wsA.close();
  wsB.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
