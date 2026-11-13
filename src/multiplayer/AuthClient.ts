// Camada 2 (lado Cliente) — Sistema de Contas do ponto de vista da
// Interface. Não conhece nenhuma regra de jogo; só troca eventos de
// autenticação com o `NetworkClient` e guarda o token/perfil obtidos.

import type { NetworkClient } from "./NetworkClient";
import type { AuthenticatedProfile } from "./protocol";

const STORAGE_KEY = "conflito:session";

export interface StoredSession {
  token: string;
  profile: AuthenticatedProfile;
}

export const AuthClient = {
  /** Envia o pedido de cadastro. A resposta (AuthSuccess/AuthError) chega via NetworkClient.onEvent. */
  register(client: NetworkClient, nickname: string, email: string, password: string): void {
    client.send({ type: "Register", nickname, email, password });
  },

  /** `nickname` aceita o nickname ou o e-mail da conta. */
  login(client: NetworkClient, nickname: string, password: string): void {
    client.send({ type: "Login", nickname, password });
  },

  /** Confirma o e-mail com o código de 6 dígitos. A resposta (AuthSuccess/AuthError) chega via onEvent. */
  verifyEmail(client: NetworkClient, nickname: string, code: string): void {
    client.send({ type: "VerifyEmail", nickname, code });
  },

  /** Pede um novo código de confirmação (o servidor impõe a espera entre pedidos). */
  resendVerification(client: NetworkClient, nickname: string): void {
    client.send({ type: "ResendVerification", nickname });
  },

  /** "Esqueci minha senha": pede o código de redefinição. `identifier` é o nickname ou o e-mail. */
  forgotPassword(client: NetworkClient, identifier: string): void {
    client.send({ type: "ForgotPassword", identifier });
  },

  /** Troca a senha com o código recebido por e-mail. A resposta (PasswordResetDone/AuthError) chega via onEvent. */
  resetPassword(client: NetworkClient, identifier: string, code: string, newPassword: string): void {
    client.send({ type: "ResetPassword", identifier, code, newPassword });
  },

  logout(client: NetworkClient): void {
    client.send({ type: "Logout" });
    AuthClient.clearSession();
  },

  /** A sessão fica no aparelho (docs/16 - Sistema de Contas, "Login obrigatório"): não pede login a cada visita. */
  saveSession(session: StoredSession): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* armazenamento bloqueado: vale só nesta aba */
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  readSession(): StoredSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignora */
    }
    window.sessionStorage.removeItem(STORAGE_KEY);
  },

  isAuthenticated(): boolean {
    return AuthClient.readSession() !== null;
  },
};
