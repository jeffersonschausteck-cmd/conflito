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

  login(client: NetworkClient, nickname: string, password: string): void {
    client.send({ type: "Login", nickname, password });
  },

  logout(client: NetworkClient): void {
    client.send({ type: "Logout" });
    AuthClient.clearSession();
  },

  saveSession(session: StoredSession): void {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  readSession(): StoredSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(STORAGE_KEY);
  },

  isAuthenticated(): boolean {
    return AuthClient.readSession() !== null;
  },
};
