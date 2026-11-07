// Diagnóstico dedicado (Sprint QA-03) — valida que uma conexão NOVA
// consegue reaproveitar um token já emitido (ResumeSession), sem pedir
// senha de novo — exatamente o cenário de "voltar ao Lobby depois de
// entrar numa sala" reportado no Bug 2.
// Rode com: bun run scripts/test-resume-session.ts

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
  const nickname = "resume_" + rand;

  console.log("== Conexão #1: Login ==");
  const ws1 = await connect(BASE + "/connect");
  await waitFor(ws1, (m) => m.type === "PlayerConnected");
  ws1.send(JSON.stringify({ type: "Register", nickname, email: "r@test.com", password: "senha1234" }));
  const auth1 = await waitFor(ws1, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (auth1.type !== "AuthSuccess") throw new Error("Cadastro falhou: " + auth1.reason);
  const token = auth1.token;
  console.log("Login OK, token salvo (como o sessionStorage faria).");
  ws1.close();

  console.log("== Conexão #2: totalmente NOVA — ResumeSession (sem enviar senha) ==");
  const ws2 = await connect(BASE + "/connect");
  await waitFor(ws2, (m) => m.type === "PlayerConnected");
  ws2.send(JSON.stringify({ type: "ResumeSession", token }));
  const resumed = await waitFor(ws2, (m) => m.type === "AuthSuccess" || m.type === "AuthError");
  if (resumed.type !== "AuthSuccess") throw new Error("ResumeSession falhou: " + resumed.reason);
  if (resumed.profile.nickname !== nickname) throw new Error("Perfil retornado não confere.");
  console.log("ResumeSession OK — reautenticado sem pedir senha.");

  console.log("== Conexão #2 já autenticada: consegue criar sala sem logar de novo ==");
  ws2.send(JSON.stringify({ type: "CreateRoom" }));
  const created = await waitFor(ws2, (m) => m.type === "RoomCreated" || m.type === "AuthError" || m.type === "ActionRejected");
  if (created.type !== "RoomCreated") throw new Error("CreateRoom após resume falhou: " + JSON.stringify(created));
  console.log(`Sala criada com sucesso após resume: ${created.roomId}`);

  console.log("\nALL RESUME CHECKS PASSED");
  ws2.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("FALHA:", err);
  process.exit(1);
});
