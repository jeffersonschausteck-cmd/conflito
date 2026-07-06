// Camada 3 — sessão segura (doc 16 "Sessão"). Token simples em
// memória: sem expiração/refresh ainda (fora do escopo desta sprint,
// só precisa provar que "sem login não há acesso online").

export interface Session {
  token: string;
  accountId: string;
  createdAt: number;
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  create(accountId: string): Session {
    const session: Session = {
      token: crypto.randomUUID(),
      accountId,
      createdAt: Date.now(),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  validate(token: string | undefined | null): Session | null {
    if (!token) return null;
    return this.sessions.get(token) ?? null;
  }

  revoke(token: string): void {
    this.sessions.delete(token);
  }
}
