// Cria (ou confirma) a conta mestre de TESTE no servidor LOCAL (wrangler dev, DEV_SHOW_CODE=1). Nunca em produção.
// Uso: MASTER_USER=... MASTER_PASS=... bun run scripts/criar-conta-mestre.ts
const user = process.env.MASTER_USER!, pass = process.env.MASTER_PASS!;
const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Só roda no servidor local.");
const ws = new WebSocket(BASE + "/connect");
const q: any[] = [];
ws.addEventListener("message", (e: any) => q.push(JSON.parse(e.data)));
await new Promise((r) => ws.addEventListener("open", r));
const wait = async (p: (m: any) => boolean, from = 0) => { for (let i = 0; i < 200; i++) { const f = q.slice(from).find(p); if (f) return f; await new Promise((r) => setTimeout(r, 50)); } throw new Error("sem resposta"); };
await wait((m) => m.type === "PlayerConnected");
let from = q.length;
ws.send(JSON.stringify({ type: "Register", nickname: user, email: `${user.toLowerCase()}@teste.local`, password: pass }));
const reg = await wait((m) => m.type === "VerificationRequired" || m.type === "AuthError" || m.type === "AuthSuccess", from);
console.log("cadastro:", reg.type, reg.message ?? reg.reason ?? "");
if (reg.type === "VerificationRequired") {
  from = q.length;
  ws.send(JSON.stringify({ type: "VerifyEmail", nickname: user, code: reg.devCode }));
  const ok = await wait((m) => m.type === "AuthSuccess" || m.type === "AuthError", from);
  console.log("confirmação:", ok.type, ok.message ?? "");
}
// confere o login
from = q.length;
ws.send(JSON.stringify({ type: "Login", nickname: user, password: pass }));
const lg = await wait((m) => m.type === "AuthSuccess" || m.type === "AuthError", from);
console.log("login:", lg.type, lg.message ?? "");
process.exit(0);
