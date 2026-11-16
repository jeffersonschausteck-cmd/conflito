// Um e-mail = uma conta (docs/16 - Sistema de Contas, "Um e-mail, uma conta") e a rota do dono para apagar contas por
// domínio. Só roda no servidor LOCAL. Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787
//   --var STATS_KEY:chave-de-teste-123 --persist-to <pasta limpa>   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-duplicate-email.ts

import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");
const HTTP = BASE.replace(/^ws/, "http");
const KEY = process.env.STATS_KEY ?? "chave-de-teste-123";

let fails = 0;
const ok = (label: string, cond = true) => {
  console.log(`  ${cond ? "✔" : "✘"} ${label}`);
  if (!cond) fails++;
};

async function ask(e: ClientEvent): Promise<ServerEvent> {
  const ws = new WebSocket(BASE + "/connect");
  const buf: ServerEvent[] = [];
  ws.addEventListener("message", (ev: any) => buf.push(JSON.parse(ev.data) as ServerEvent));
  await new Promise((res, rej) => {
    ws.addEventListener("open", () => res(null));
    ws.addEventListener("error", rej);
  });
  await new Promise((r) => setTimeout(r, 150));
  const from = buf.length;
  ws.send(JSON.stringify(e));
  const t0 = Date.now();
  for (;;) {
    const f = buf.slice(from).find((m) => m.type !== "PlayerConnected");
    if (f) {
      ws.close();
      return f;
    }
    if (Date.now() - t0 > 8000) throw new Error("sem resposta do servidor");
    await new Promise((r) => setTimeout(r, 30));
  }
}
const reason = (m: ServerEvent) => (m.type === "AuthError" ? m.reason : `(${m.type})`);

async function create(nick: string, email: string, pass = "senha-123"): Promise<ServerEvent> {
  const reg = await ask({ type: "Register", nickname: nick, email, password: pass });
  if (reg.type === "VerificationRequired" && reg.devCode) return ask({ type: "VerifyEmail", nickname: nick, code: reg.devCode });
  return reg;
}
async function admin(path: string, body?: unknown, key: string | null = KEY) {
  const res = await fetch(HTTP + path, {
    method: body ? "POST" : "GET",
    headers: key ? { authorization: `Bearer ${key}` } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: res.ok ? await res.json() : null };
}

async function main() {
  const s = Date.now().toString(36);
  const dom = `lixo${s}.invalid`;

  console.log("Um e-mail, uma conta");
  ok("primeira conta é criada e confirmada", (await create(`um_${s}`, `fulano${s}@${dom}`)).type === "AuthSuccess");
  const r1 = reason(await ask({ type: "Register", nickname: `dois_${s}`, email: `fulano${s}@${dom}`, password: "senha-123" }));
  ok(`mesmo e-mail é recusado: "${r1}"`, /já tem uma conta/.test(r1));
  const r2 = reason(await ask({ type: "Register", nickname: `tres_${s}`, email: `FULANO${s}@${dom}`.toUpperCase(), password: "senha-123" }));
  ok("mesmo e-mail em maiúsculas é recusado", /já tem uma conta/.test(r2));
  const r3 = reason(await ask({ type: "Register", nickname: `quatro_${s}`, email: `fulano${s}+jogo@${dom}`, password: "senha-123" }));
  ok("e-mail com +apelido é a mesma caixa e é recusado", /já tem uma conta/.test(r3));
  ok("conta de Gmail é criada", (await create(`gm_${s}`, `a.b.c${s}@gmail.com`)).type === "AuthSuccess");
  const r4 = reason(await ask({ type: "Register", nickname: `gm2_${s}`, email: `abc${s}+x@googlemail.com`, password: "senha-123" }));
  ok("Gmail com pontos/+apelido/googlemail é a mesma caixa e é recusado", /já tem uma conta/.test(r4));
  ok("e-mail diferente continua podendo criar conta", (await create(`outro_${s}`, `outro${s}@${dom}`)).type === "AuthSuccess");
  ok("a primeira conta ainda entra pelo e-mail", (await ask({ type: "Login", nickname: `fulano${s}@${dom}`, password: "senha-123" })).type === "AuthSuccess");

  console.log("Apagar contas por domínio (rota do dono)");
  ok("sem chave: 404", (await admin("/stats/delete-accounts", { domains: [dom], confirm: true }, null)).status === 404);
  ok("chave errada: 404", (await admin("/stats/delete-accounts", { domains: [dom], confirm: true }, "errada")).status === 404);
  const sim = await admin("/stats/delete-accounts", { domains: [dom] });
  ok(`simulação conta 2 contas e não apaga (${JSON.stringify(sim.json)})`, sim.status === 200 && sim.json.simulacao === true && sim.json.contasEncontradas === 2);
  ok("depois da simulação a conta ainda entra", (await ask({ type: "Login", nickname: `fulano${s}@${dom}`, password: "senha-123" })).type === "AuthSuccess");
  const del = await admin("/stats/delete-accounts", { domains: [dom], confirm: true });
  ok(`apaga as 2 contas (${JSON.stringify(del.json)})`, del.status === 200 && del.json.apagadas === 2);
  const gone = reason(await ask({ type: "Login", nickname: `fulano${s}@${dom}`, password: "senha-123" }));
  ok(`conta apagada não entra mais: "${gone}"`, gone === "Usuário ou e-mail não encontrado.");
  ok("o e-mail apagado pode ser usado de novo", (await create(`volta_${s}`, `fulano${s}@${dom}`)).type === "AuthSuccess");
  ok("a conta do Gmail (outro domínio) continua", (await ask({ type: "Login", nickname: `gm_${s}`, password: "senha-123" })).type === "AuthSuccess");
  await admin("/stats/delete-accounts", { domains: [dom, "gmail.com"], confirm: true }); // limpa o que o teste criou

  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
