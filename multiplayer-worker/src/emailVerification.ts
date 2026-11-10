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
  const devMode = env.DEV_SHOW_CODE === "1";
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (devMode) {
      console.log(`[dev] código de confirmação de ${to}: ${code}`);
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
        subject: `Seu código do Conflito: ${code}`,
        text: `Olá, ${nickname}!

Seu código de confirmação do Conflito é ${code}.
Ele vale por 15 minutos.

Se você não criou uma conta, ignore este e-mail.`,
        html: `<p>Olá, <strong>${nickname.replace(/[<>&]/g, "")}</strong>!</p><p>Seu código de confirmação do Conflito é:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p><p>Ele vale por 15 minutos.</p><p style="color:#666">Se você não criou uma conta, ignore este e-mail.</p>`,
      }),
    });
    if (!res.ok) {
      console.error("Falha ao enviar e-mail de confirmação:", res.status, await res.text().catch(() => ""));
      return { ok: false, reason: "Não foi possível enviar o e-mail de confirmação. Confira o endereço e tente de novo." };
    }
    return devMode ? { ok: true, devCode: code } : { ok: true };
  } catch (err) {
    console.error("Erro ao enviar e-mail de confirmação:", err);
    return { ok: false, reason: "Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde." };
  }
}
