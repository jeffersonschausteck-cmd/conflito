// Teste E2E do login por usuário ou e-mail, dos retornos de erro e da recuperação de senha, contra o servidor LOCAL
// (wrangler dev). Nunca roda no Cloudflare de produção. (docs/16 - Sistema de Contas, "Entrar e Recuperar a Senha")
// Antes: cd multiplayer-worker && npx wrangler dev -c wrangler.toml --port 8787   (com DEV_SHOW_CODE=1 no .dev.vars)
// Rode com: bun run scripts/test-login-recovery.ts

import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const BASE = process.env.WORKER_URL ?? "ws://127.0.0.1:8787";
if (/workers\.dev|conflito\.online/.test(BASE)) throw new Error("Este teste só roda no servidor local.");

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
function waitNew(ws: WebSocket, from: number, timeoutMs = 8000): Promise<ServerEvent> {
  const buf = buffers.get(ws)!;
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const f = buf.slice(from).find((m) => m.type !== "PlayerConnected");
      if (f) {
        clearInterval(iv);
        resolve(f);
      } else if (Date.now() - t0 > timeoutMs) {
        clearInterval(iv);
        reject(new Error("sem resposta do servidor"));
      }
    }, 30);
  });
}
/** Abre uma conexão nova, manda uma mensagem e devolve a primeira resposta. */
async function ask(e: ClientEvent): Promise<ServerEvent> {
  const ws = await connect(BASE + "/connect");
  await new Promise((r) => setTimeout(r, 150)); // deixa o PlayerConnected chegar
  const from = buffers.get(ws)!.length;
  ws.send(JSON.stringify(e));
  const reply = await waitNew(ws, from);
  ws.close();
  return reply;
}
const reason = (m: ServerEvent) => (m.type === "AuthError" ? m.reason : `(${m.type})`);

async function main() {
  const stamp = Date.now().toString(36);
  const nick = `lg_${stamp}`;
  const mail = `lg.${stamp}@teste.local`;
  const pass1 = "senha-um-123";
  const pass2 = "senha-dois-456";

  console.log("Cadastro e confirmação");
  const reg = await ask({ type: "Register", nickname: nick, email: mail, password: pass1 });
  ok("cadastro pede o código", reg.type === "VerificationRequired" && !!reg.devCode);
  const devCode = reg.type === "VerificationRequired" ? reg.devCode! : "";
  const verified = await ask({ type: "VerifyEmail", nickname: nick, code: devCode });
  ok("código certo confirma e entra", verified.type === "AuthSuccess");

  console.log("Entrar por usuário ou e-mail");
  ok("entra com o nickname", (await ask({ type: "Login", nickname: nick, password: pass1 })).type === "AuthSuccess");
  ok("entra com o nickname em maiúsculas", (await ask({ type: "Login", nickname: nick.toUpperCase(), password: pass1 })).type === "AuthSuccess");
  ok("entra com o e-mail", (await ask({ type: "Login", nickname: mail, password: pass1 })).type === "AuthSuccess");
  ok("entra com o e-mail em maiúsculas e com espaços", (await ask({ type: "Login", nickname: `  ${mail.toUpperCase()} `, password: pass1 })).type === "AuthSuccess");

  console.log("Retornos de erro");
  const r1 = reason(await ask({ type: "Login", nickname: "ninguem_" + stamp, password: pass1 }));
  ok(`usuário que não existe: "${r1}"`, r1 === "Usuário ou e-mail não encontrado.");
  const r2 = reason(await ask({ type: "Login", nickname: `nao.existe.${stamp}@teste.local`, password: pass1 }));
  ok(`e-mail que não existe: "${r2}"`, r2 === "Usuário ou e-mail não encontrado.");
  const r3 = reason(await ask({ type: "Login", nickname: nick, password: "errada!!" }));
  ok(`senha errada: "${r3}"`, r3 === "Senha incorreta.");
  const r4 = reason(await ask({ type: "Login", nickname: mail, password: "errada!!" }));
  ok(`senha errada pelo e-mail: "${r4}"`, r4 === "Senha incorreta.");
  const r5 = reason(await ask({ type: "Login", nickname: "   ", password: pass1 }));
  ok(`usuário vazio: "${r5}"`, r5 === "Informe seu usuário ou e-mail.");
  const r6 = reason(await ask({ type: "Login", nickname: nick, password: "" }));
  ok(`senha vazia: "${r6}"`, r6 === "Digite sua senha.");

  console.log("Esqueci minha senha");
  const f0 = reason(await ask({ type: "ForgotPassword", identifier: "ninguem_" + stamp }));
  ok(`conta que não existe: "${f0}"`, f0 === "Não encontramos uma conta com esse usuário ou e-mail.");
  const f00 = reason(await ask({ type: "ForgotPassword", identifier: "  " }));
  ok(`campo vazio: "${f00}"`, f00 === "Informe seu usuário ou e-mail.");
  const f1 = await ask({ type: "ForgotPassword", identifier: mail });
  ok("pelo e-mail: o código é enviado", f1.type === "PasswordResetSent" && !!f1.devCode);
  ok("o e-mail volta mascarado", f1.type === "PasswordResetSent" && f1.email.includes("*") && !f1.email.startsWith(mail));
  const resetCode = f1.type === "PasswordResetSent" ? f1.devCode! : "";
  const f2 = reason(await ask({ type: "ForgotPassword", identifier: nick }));
  ok(`pedir de novo na hora: "${f2}"`, /^Aguarde \d+ s para pedir um novo código\.$/.test(f2));

  const wrong = reason(await ask({ type: "ResetPassword", identifier: nick, code: resetCode === "000000" ? "111111" : "000000", newPassword: pass2 }));
  ok(`código errado: "${wrong}"`, wrong === "Código incorreto. Restam 4 tentativas.");
  const short = reason(await ask({ type: "ResetPassword", identifier: nick, code: resetCode, newPassword: "abc" }));
  ok(`senha nova curta: "${short}"`, short === "A nova senha precisa ter pelo menos 4 caracteres.");
  ok("a senha continua a antiga enquanto não redefine", (await ask({ type: "Login", nickname: nick, password: pass1 })).type === "AuthSuccess");
  const done = await ask({ type: "ResetPassword", identifier: mail, code: resetCode, newPassword: pass2 });
  ok("código certo troca a senha", done.type === "PasswordResetDone");
  const old = reason(await ask({ type: "Login", nickname: nick, password: pass1 }));
  ok(`a senha antiga deixa de valer: "${old}"`, old === "Senha incorreta.");
  ok("entra com a senha nova (nickname)", (await ask({ type: "Login", nickname: nick, password: pass2 })).type === "AuthSuccess");
  ok("entra com a senha nova (e-mail)", (await ask({ type: "Login", nickname: mail, password: pass2 })).type === "AuthSuccess");
  const reuse = reason(await ask({ type: "ResetPassword", identifier: nick, code: resetCode, newPassword: "outra-senha" }));
  ok(`o mesmo código não serve duas vezes: "${reuse}"`, reuse === "Nenhum código ativo. Peça um novo código.");

  console.log("Limite de tentativas");
  const nick2 = `lb_${stamp}`;
  const reg2 = await ask({ type: "Register", nickname: nick2, email: `lb.${stamp}@teste.local`, password: pass1 });
  const code2 = reg2.type === "VerificationRequired" ? reg2.devCode! : "";
  await ask({ type: "VerifyEmail", nickname: nick2, code: code2 });
  let last = "";
  for (let i = 1; i <= 8; i++) last = reason(await ask({ type: "Login", nickname: nick2, password: "errada" + i }));
  ok(`8ª senha errada bloqueia: "${last}"`, /Muitas tentativas/.test(last));
  const blocked = reason(await ask({ type: "Login", nickname: nick2, password: pass1 }));
  ok(`até a senha certa fica bloqueada: "${blocked}"`, /^Muitas tentativas\. Tente de novo em \d+ min\.$/.test(blocked));
  // Redefinir a senha também libera a conta.
  const f3 = await ask({ type: "ForgotPassword", identifier: nick2 });
  const code3 = f3.type === "PasswordResetSent" ? f3.devCode! : "";
  ok("recuperação de senha funciona mesmo com a conta bloqueada", (await ask({ type: "ResetPassword", identifier: nick2, code: code3, newPassword: pass2 })).type === "PasswordResetDone");
  ok("depois de redefinir, a conta entra de novo", (await ask({ type: "Login", nickname: nick2, password: pass2 })).type === "AuthSuccess");

  console.log("Conta ainda não confirmada");
  const nick3 = `lu_${stamp}`;
  const mail3 = `lu.${stamp}@teste.local`;
  await ask({ type: "Register", nickname: nick3, email: mail3, password: pass1 });
  const pendingLogin = await ask({ type: "Login", nickname: mail3, password: pass1 });
  ok("login pelo e-mail de conta não confirmada pede o código", pendingLogin.type === "VerificationRequired" && pendingLogin.nickname === nick3);
  const f4 = await ask({ type: "ForgotPassword", identifier: mail3 });
  const code4 = f4.type === "PasswordResetSent" ? f4.devCode! : "";
  ok("esqueci a senha também vale para conta não confirmada", f4.type === "PasswordResetSent");
  ok("redefinir confirma a conta", (await ask({ type: "ResetPassword", identifier: nick3, code: code4, newPassword: pass2 })).type === "PasswordResetDone");
  ok("e ela já entra direto", (await ask({ type: "Login", nickname: nick3, password: pass2 })).type === "AuthSuccess");

  console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no teste:", e);
  process.exit(1);
});
