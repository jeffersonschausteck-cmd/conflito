// Camada 3 — Sistema de Contas (doc 16), versão mínima desta sprint.
//
// Guarda contas em memória (sem banco definitivo — combinado). A API
// pública (register/login/getById) não muda quando isso for trocado
// por persistência real no futuro. Nenhum dado de conta chega ao
// Motor — só o Multiplayer (Room/RoomManager) conhece isso.

export interface Account {
  id: string;
  nickname: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface PublicProfile {
  id: string;
  nickname: string;
  createdAt: number;
}

function toPublicProfile(account: Account): PublicProfile {
  return { id: account.id, nickname: account.nickname, createdAt: account.createdAt };
}

export class AccountManager {
  private byId = new Map<string, Account>();
  private byNickname = new Map<string, string>(); // nickname (lowercase) -> id

  async register(nickname: string, email: string, password: string): Promise<
    { ok: true; profile: PublicProfile } | { ok: false; reason: string }
  > {
    const key = nickname.trim().toLowerCase();
    if (!key || password.length < 4) {
      return { ok: false, reason: "Nickname ou senha inválidos." };
    }
    if (this.byNickname.has(key)) {
      return { ok: false, reason: "Este nickname já está em uso." };
    }

    const account: Account = {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      email: email.trim(),
      passwordHash: await Bun.password.hash(password),
      createdAt: Date.now(),
    };
    this.byId.set(account.id, account);
    this.byNickname.set(key, account.id);

    return { ok: true, profile: toPublicProfile(account) };
  }

  async login(nickname: string, password: string): Promise<
    { ok: true; profile: PublicProfile } | { ok: false; reason: string }
  > {
    const id = this.byNickname.get(nickname.trim().toLowerCase());
    const account = id ? this.byId.get(id) : undefined;
    if (!account) {
      return { ok: false, reason: "Nickname ou senha incorretos." };
    }

    const valid = await Bun.password.verify(password, account.passwordHash);
    if (!valid) {
      return { ok: false, reason: "Nickname ou senha incorretos." };
    }

    return { ok: true, profile: toPublicProfile(account) };
  }

  getProfile(accountId: string): PublicProfile | null {
    const account = this.byId.get(accountId);
    return account ? toPublicProfile(account) : null;
  }
}
