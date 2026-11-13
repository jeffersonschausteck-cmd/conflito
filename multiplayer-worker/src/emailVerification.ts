// Confirmação de e-mail do cadastro (docs/16 - Sistema de Contas): código, regras de uso e envio.
import type { Env } from "./env";

export const CODE_TTL_MS = 15 * 60_000;
export const CODE_MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60_000;
export const MAX_SENDS_PER_HOUR = 5;
export const PENDING_TTL_MS = 24 * 60 * 60_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  const e = email.trim();
  return e.length <= 254 && EMAIL_RE.test(e);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "jo***@gmail.com": mostra só o começo, para a tela de confirmação. */
export function maskEmail(email: string): string {
  const [user, domain] = email.trim().split("@");
  if (!domain) return email;
  const shown = user.slice(0, Math.min(2, user.length));
  return `${shown}${"*".repeat(Math.max(3, user.length - shown.length))}@${domain}`;
}

/** Código de 6 dígitos, sorteado com o gerador seguro do navegador/servidor. */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

/** Hash do código (o servidor nunca guarda o código em si). `salt` é o id da conta. */
export async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type SendResult = { ok: true; devCode?: string } | { ok: false; reason: string };

/**
 * Envia o código por e-mail pelo provedor configurado (Resend). Sem provedor, só o modo de
 * desenvolvimento (`DEV_SHOW_CODE=1`) deixa seguir, devolvendo o código para a tela; em produção a
 * falta de provedor recusa o cadastro (melhor do que criar uma conta que ninguém consegue confirmar).
 */
export async function sendVerificationEmail(env: Env, to: string, nickname: string, code: string): Promise<SendResult> {
  return sendCodeEmail(env, to, nickname, code, "verify");
}

export type CodePurpose = "verify" | "reset";

/** Envia um código de 6 dígitos: confirmação do cadastro (`verify`) ou redefinição de senha (`reset`). */
export async function sendCodeEmail(env: Env, to: string, nickname: string, code: string, purpose: CodePurpose): Promise<SendResult> {
  const reset = purpose === "reset";
  const subject = reset ? `Redefinir sua senha do Conflito: ${code}` : `Seu código do Conflito: ${code}`;
  const intro = reset ? "Recebemos um pedido para redefinir a senha da sua conta. Seu código é" : "Seu código de confirmação do Conflito é";
  const ignore = reset ? "Se você não pediu para redefinir a senha, ignore este e-mail: a senha continua a mesma." : "Se você não criou uma conta, ignore este e-mail.";
  const devMode = env.DEV_SHOW_CODE === "1";
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (devMode) {
      console.log(`[dev] código ${reset ? "de redefinição de senha" : "de confirmação"} de ${to}: ${code}`);
      return { ok: true, devCode: code };
    }
    return { ok: false, reason: "O envio de e-mail ainda não está configurado. Tente novamente mais tarde." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject,
        text: `Olá, ${nickname}!

${intro} ${code}.
Ele vale por 15 minutos.

${ignore}`,
        html: `<p>Olá, <strong>${nickname.replace(/[<>&]/g, "")}</strong>!</p><p>${intro}:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p><p>Ele vale por 15 minutos.</p><p style="color:#666">${ignore}</p>`,
      }),
    });
    if (!res.ok) {
      console.error("Falha ao enviar e-mail de código:", res.status, await res.text().catch(() => ""));
      return { ok: false, reason: "Não foi possível enviar o e-mail. Confira o endereço e tente de novo." };
    }
    return devMode ? { ok: true, devCode: code } : { ok: true };
  } catch (err) {
    console.error("Erro ao enviar e-mail de código:", err);
    return { ok: false, reason: "Não foi possível enviar o e-mail. Tente novamente mais tarde." };
  }
}
