// Camada 3 — Durable Object "AccountsRoom": instância ÚNICA e fixa
// (Sprint MP-04) que trata Login/Cadastro/Criar Sala/Entrar Sala —
// tudo que acontece ANTES de existir uma sala. Uma vez que o jogador
// entra numa sala, o cliente reconecta direto na `GameRoom` daquela
// sala (uma Durable Object por sala); esta instância só guarda contas,
// sessões e quais `roomId` existem.
//
// Porta direta de `server/src/AccountManager.ts` + `SessionManager.ts`
// + a parte de Register/Login/CreateRoom/JoinRoom de `index.ts`, sem
// nenhuma regra nova. Hash de senha via `CryptoService` — nunca API de
// criptografia direta (Sprint MP-04, item 2).

import { DurableObject } from "cloudflare:workers";
import { acceptWebSocket, type TransportConnection } from "./durableTransport";
import { CryptoService } from "@/services/cryptoService";
import type { ClientEvent, PlayerId, RoomPlayerInfo, ServerEvent } from "@/multiplayer/protocol";
import type { Env } from "./env";

interface Account {
  id: string;
  nickname: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

interface Session {
  token: string;
  accountId: string;
  createdAt: number;
}

interface ConnectedPlayer {
  playerId: PlayerId;
  playerName: string;
  accountId: string | null;
  nickname: string | null;
}

export class AccountsRoom extends DurableObject<Env> {
  private accountsById = new Map<string, Account>();
  private accountsByNickname = new Map<string, string>();
  private sessions = new Map<string, Session>();
  private activeRoomIds = new Set<string>();

  private playersByConnection = new Map<string, ConnectedPlayer>();

  async fetch(request: Request): Promise<Response> {
    return acceptWebSocket(request, {
      onConnect: (conn) => this.handleConnect(conn),
      onMessage: (conn, data) => this.handleMessage(conn, data),
      onClose: (conn) => this.handleClose(conn),
    });
  }

  // ── Contas (idêntico a AccountManager.ts) ───────────────────────

  private async register(nickname: string, email: string, password: string) {
    const key = nickname.trim().toLowerCase();
    if (!key || password.length < 4) {
      return { ok: false as const, reason: "Nickname ou senha inválidos." };
    }
    if (this.accountsByNickname.has(key)) {
      return { ok: false as const, reason: "Este nickname já está em uso." };
    }
    const account: Account = {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      email: email.trim(),
      passwordHash: await CryptoService.hash(password),
      createdAt: Date.now(),
    };
    this.accountsById.set(account.id, account);
    this.accountsByNickname.set(key, account.id);
    return { ok: true as const, profile: this.toPublicProfile(account) };
  }

  private async login(nickname: string, password: string) {
    const id = this.accountsByNickname.get(nickname.trim().toLowerCase());
    const account = id ? this.accountsById.get(id) : undefined;
    if (!account) return { ok: false as const, reason: "Nickname ou senha incorretos." };
    const valid = await CryptoService.verify(password, account.passwordHash);
    if (!valid) return { ok: false as const, reason: "Nickname ou senha incorretos." };
    return { ok: true as const, profile: this.toPublicProfile(account) };
  }

  private toPublicProfile(account: Account) {
    return { id: account.id, nickname: account.nickname, createdAt: account.createdAt };
  }

  private createSession(accountId: string): Session {
    const session: Session = { token: crypto.randomUUID(), accountId, createdAt: Date.now() };
    this.sessions.set(session.token, session);
    return session;
  }

  // ── Transporte / eventos de rede ────────────────────────────────

  private send(conn: TransportConnection, event: ServerEvent): void {
    conn.send(JSON.stringify(event));
  }

  private handleConnect(conn: TransportConnection): void {
    const player: ConnectedPlayer = {
      playerId: crypto.randomUUID(),
      playerName: "Comandante",
      accountId: null,
      nickname: null,
    };
    this.playersByConnection.set(conn.id, player);
    this.send(conn, { type: "PlayerConnected", playerId: player.playerId });
  }

  private handleClose(conn: TransportConnection): void {
    this.playersByConnection.delete(conn.id);
  }

  private async handleMessage(conn: TransportConnection, raw: string): Promise<void> {
    const player = this.playersByConnection.get(conn.id);
    if (!player) return;

    let event: ClientEvent;
    try {
      event = JSON.parse(raw) as ClientEvent;
    } catch {
      this.send(conn, { type: "ActionRejected", reason: "Mensagem inválida." });
      return;
    }

    switch (event.type) {
      case "Register": {
        const result = await this.register(event.nickname, event.email, event.password);
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        const session = this.createSession(result.profile.id);
        player.accountId = result.profile.id;
        player.nickname = result.profile.nickname;
        player.playerName = result.profile.nickname;
        this.send(conn, {
          type: "AuthSuccess",
          token: session.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "Login": {
        const result = await this.login(event.nickname, event.password);
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        const session = this.createSession(result.profile.id);
        player.accountId = result.profile.id;
        player.nickname = result.profile.nickname;
        player.playerName = result.profile.nickname;
        this.send(conn, {
          type: "AuthSuccess",
          token: session.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "Logout": {
        player.accountId = null;
        player.nickname = null;
        break;
      }

      case "CreateRoom": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado para jogar online." });
          break;
        }
        const roomId = crypto.randomUUID().slice(0, 8);
        const added = await this.addPlayerToRoom(roomId, player.playerId, player.nickname ?? player.playerName);
        if (!added.ok) {
          this.send(conn, { type: "ActionRejected", reason: added.reason ?? "Não foi possível criar a sala." });
          break;
        }
        this.activeRoomIds.add(roomId);
        this.send(conn, { type: "RoomCreated", roomId, you: added.player });
        break;
      }

      case "JoinRoom": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado para jogar online." });
          break;
        }
        if (!this.activeRoomIds.has(event.roomId)) {
          this.send(conn, { type: "ActionRejected", reason: "Sala não encontrada." });
          break;
        }
        const added = await this.addPlayerToRoom(event.roomId, player.playerId, player.nickname ?? player.playerName);
        if (!added.ok) {
          this.send(conn, { type: "ActionRejected", reason: added.reason ?? "Não foi possível entrar na sala." });
          break;
        }
        this.send(conn, { type: "RoomJoined", roomId: event.roomId, you: added.player, players: added.players ?? [added.player] });
        break;
      }

      case "LeaveRoom": {
        // Só chega aqui se o jogador nunca reconectou à GameRoom (ex.: desistiu
        // antes da tela de espera terminar de trocar de socket) — nada a fazer,
        // a GameRoom trata LeaveRoom normalmente depois da reconexão.
        break;
      }

      default:
        break;
    }
  }

  /** Registra o jogador na GameRoom (Durable Object própria da sala) via chamada interna DO-a-DO. */
  private async addPlayerToRoom(
    roomId: string,
    playerId: PlayerId,
    playerName: string,
  ): Promise<{ ok: true; player: RoomPlayerInfo; players?: RoomPlayerInfo[] } | { ok: false; reason?: string }> {
    const stub = this.env.ROOM.get(this.env.ROOM.idFromName(roomId));
    const response = await stub.fetch("https://internal/internal/add-player", {
      method: "POST",
      body: JSON.stringify({ playerId, playerName }),
    });
    return (await response.json()) as
      | { ok: true; player: RoomPlayerInfo; players?: RoomPlayerInfo[] }
      | { ok: false; reason?: string };
  }
}
