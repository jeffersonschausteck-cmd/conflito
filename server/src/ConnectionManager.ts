// Camada 3 — "Estrutura dos jogadores conectados".
//
// Mantém o mapeamento entre uma conexão de transporte, um jogador e a
// sala em que ele está. A partir da Sprint MP-02, uma conexão também
// pode estar autenticada (`accountId`/`nickname`, vindos do Sistema de
// Contas) — mas isso é só um dado carregado aqui, nunca repassado ao
// Motor. Sem `accountId`, a conexão não pode criar/entrar em salas.

import type { ConnectionId, TransportConnection } from "./transport";
import type { PlayerId, RoomId } from "@/multiplayer/protocol";

export interface ConnectedPlayer {
  connectionId: ConnectionId;
  playerId: PlayerId;
  playerName: string;
  roomId: RoomId | null;
  connectedAt: number;
  /** Preenchido após Register/Login bem-sucedido nesta conexão. */
  accountId: string | null;
  nickname: string | null;
}

export class ConnectionManager {
  private byConnection = new Map<ConnectionId, ConnectedPlayer>();
  private byPlayerId = new Map<PlayerId, ConnectedPlayer>();

  register(conn: TransportConnection, playerName?: string): ConnectedPlayer {
    const player: ConnectedPlayer = {
      connectionId: conn.id,
      playerId: crypto.randomUUID(),
      playerName: playerName?.trim() || "Comandante",
      roomId: null,
      connectedAt: Date.now(),
      accountId: null,
      nickname: null,
    };
    this.byConnection.set(conn.id, player);
    this.byPlayerId.set(player.playerId, player);
    return player;
  }

  setAuthenticated(playerId: PlayerId, accountId: string, nickname: string): void {
    const player = this.byPlayerId.get(playerId);
    if (!player) return;
    player.accountId = accountId;
    player.nickname = nickname;
    player.playerName = nickname;
  }

  unregister(connectionId: ConnectionId): ConnectedPlayer | undefined {
    const player = this.byConnection.get(connectionId);
    if (!player) return undefined;
    this.byConnection.delete(connectionId);
    this.byPlayerId.delete(player.playerId);
    return player;
  }

  getByConnection(connectionId: ConnectionId): ConnectedPlayer | undefined {
    return this.byConnection.get(connectionId);
  }

  getByPlayerId(playerId: PlayerId): ConnectedPlayer | undefined {
    return this.byPlayerId.get(playerId);
  }

  setRoom(playerId: PlayerId, roomId: RoomId | null): void {
    const player = this.byPlayerId.get(playerId);
    if (player) player.roomId = roomId;
  }

  count(): number {
    return this.byConnection.size;
  }
}
