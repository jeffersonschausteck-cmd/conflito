// Camada 3 — bootstrap do servidor autoritativo do Conflito.
//
// Liga o transporte (Camada 3) aos eventos de rede (Camada 2, contrato
// em `src/multiplayer/protocol.ts`), sem nenhuma regra de jogo aqui —
// toda decisão de partida passa por `Room.applyAction` → `GameSession`
// → `GameEngine` (Camada 1, inalterado).

import { BunWebSocketTransport, type TransportConnection } from "./transport";
import { ConnectionManager } from "./ConnectionManager";
import { RoomManager } from "./RoomManager";
import { AccountManager } from "./AccountManager";
import { SessionManager } from "./SessionManager";
import type { ClientEvent, ServerEvent } from "@/multiplayer/protocol";

const PORT = Number(process.env.CONFLITO_SERVER_PORT ?? 8787);

const connections = new ConnectionManager();
const rooms = new RoomManager();
const accounts = new AccountManager();
const sessions = new SessionManager();

function send(conn: TransportConnection, event: ServerEvent): void {
  conn.send(JSON.stringify(event));
}

function broadcastToRoom(roomId: string, event: ServerEvent, connByPlayerId: Map<string, TransportConnection>) {
  const room = rooms.getRoom(roomId);
  if (!room) return;
  for (const player of room.getPlayers()) {
    const conn = connByPlayerId.get(player.playerId);
    if (conn) send(conn, event);
  }
}

/** Avisa a sala inteira sobre a fase atual (waiting/ready/deployment/playing). */
function broadcastRoomState(roomId: string) {
  const room = rooms.getRoom(roomId);
  if (!room) return;
  broadcastToRoom(
    roomId,
    {
      type: "RoomStateChanged",
      roomId,
      status: room.status,
      players: room.getPlayers(),
      readyPlayerIds: room.getReadyPlayerIds(),
      deployedPlayerIds: room.getDeployedPlayerIds(),
    },
    connectionByPlayerId,
  );
}

// playerId -> conexão de transporte ativa (para broadcast dentro da sala).
const connectionByPlayerId = new Map<string, TransportConnection>();

const transport = new BunWebSocketTransport(PORT);

transport.start({
  onConnect(conn) {
    const player = connections.register(conn);
    connectionByPlayerId.set(player.playerId, conn);
    send(conn, { type: "PlayerConnected", playerId: player.playerId });
  },

  async onMessage(conn, raw) {
    const player = connections.getByConnection(conn.id);
    if (!player) return;

    let event: ClientEvent;
    try {
      event = JSON.parse(raw) as ClientEvent;
    } catch {
      send(conn, { type: "ActionRejected", reason: "Mensagem inválida." });
      return;
    }

    switch (event.type) {
      case "Register": {
        const result = await accounts.register(event.nickname, event.email, event.password);
        if (!result.ok) {
          send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        const session = sessions.create(result.profile.id);
        connections.setAuthenticated(player.playerId, result.profile.id, result.profile.nickname);
        send(conn, {
          type: "AuthSuccess",
          token: session.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "Login": {
        const result = await accounts.login(event.nickname, event.password);
        if (!result.ok) {
          send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        const session = sessions.create(result.profile.id);
        connections.setAuthenticated(player.playerId, result.profile.id, result.profile.nickname);
        send(conn, {
          type: "AuthSuccess",
          token: session.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "Logout": {
        if (player.roomId) {
          rooms.getRoom(player.roomId)?.removePlayer(player.playerId);
          connections.setRoom(player.playerId, null);
        }
        connections.setAuthenticated(player.playerId, "", "");
        player.accountId = null;
        player.nickname = null;
        break;
      }

      case "CreateRoom": {
        if (!player.accountId) {
          send(conn, { type: "AuthError", reason: "É preciso estar autenticado para jogar online." });
          break;
        }
        const room = rooms.createRoom();
        const roomPlayer = room.addPlayer(player.playerId, player.nickname ?? player.playerName);
        connections.setRoom(player.playerId, room.id);
        send(conn, { type: "RoomCreated", roomId: room.id, you: roomPlayer });
        broadcastRoomState(room.id);
        break;
      }

      case "JoinRoom": {
        if (!player.accountId) {
          send(conn, { type: "AuthError", reason: "É preciso estar autenticado para jogar online." });
          break;
        }
        const room = rooms.getRoom(event.roomId);
        if (!room) {
          send(conn, { type: "ActionRejected", reason: "Sala não encontrada." });
          break;
        }
        if (room.isFull()) {
          send(conn, { type: "ActionRejected", reason: "Sala já está cheia." });
          break;
        }

        const roomPlayer = room.addPlayer(player.playerId, player.nickname ?? player.playerName);
        connections.setRoom(player.playerId, room.id);
        send(conn, { type: "RoomJoined", roomId: room.id, you: roomPlayer, players: room.getPlayers() });
        broadcastRoomState(room.id);
        break;
      }

      case "LeaveRoom": {
        if (!player.roomId) break;
        const roomId = player.roomId;
        const room = rooms.getRoom(roomId);
        room?.removePlayer(player.playerId);
        connections.setRoom(player.playerId, null);
        broadcastRoomState(roomId);
        rooms.pruneEmpty();
        break;
      }

      case "PlayerReady": {
        if (!player.roomId) {
          send(conn, { type: "ActionRejected", reason: "Você não está em uma sala." });
          break;
        }
        const room = rooms.getRoom(player.roomId);
        if (!room) break;

        const result = room.markReady(player.playerId);
        if (!result.ok) {
          send(conn, { type: "ActionRejected", reason: result.reason ?? "Não foi possível confirmar." });
          break;
        }
        broadcastRoomState(room.id);
        break;
      }

      case "ConfirmDeployment": {
        if (!player.roomId) {
          send(conn, { type: "ActionRejected", reason: "Você não está em uma sala." });
          break;
        }
        const room = rooms.getRoom(player.roomId);
        if (!room) break;

        const result = room.confirmDeployment(player.playerId, event.pieces);
        if (!result.ok) {
          send(conn, { type: "ActionRejected", reason: result.reason ?? "Posicionamento inválido." });
          break;
        }
        broadcastRoomState(room.id);

        if (room.status === "playing" && room.session) {
          broadcastToRoom(room.id, { type: "GameStarted", state: room.session.getState() }, connectionByPlayerId);
        }
        break;
      }

      case "SelectPiece":
      case "MovePiece":
      case "EndTurn": {
        if (!player.roomId) {
          send(conn, { type: "ActionRejected", reason: "Você não está em uma sala." });
          break;
        }
        const room = rooms.getRoom(player.roomId);
        if (!room) break;

        const action =
          event.type === "SelectPiece"
            ? ({ type: "SELECT_PIECE", pieceId: event.pieceId } as const)
            : event.type === "MovePiece"
              ? ({ type: "MOVE_SELECTED", row: event.row, column: event.column } as const)
              : ({ type: "END_TURN" } as const);

        const result = room.applyAction(player.playerId, action);

        if (!result.ok) {
          send(conn, { type: "ActionRejected", reason: result.reason ?? "Ação inválida." });
          break;
        }

        if (result.state.gameOver && result.state.winner) {
          broadcastToRoom(
            room.id,
            { type: "GameFinished", winner: result.state.winner, state: result.state },
            connectionByPlayerId,
          );
        } else {
          broadcastToRoom(
            room.id,
            { type: "ActionApplied", state: result.state, appliedBy: player.playerId },
            connectionByPlayerId,
          );
        }
        break;
      }
    }
  },

  onClose(conn) {
    const player = connections.unregister(conn.id);
    connectionByPlayerId.delete(player?.playerId ?? "");
    if (!player) return;

    if (player.roomId) {
      const roomId = player.roomId;
      const room = rooms.getRoom(roomId);
      room?.removePlayer(player.playerId);
      broadcastToRoom(roomId, { type: "PlayerDisconnected", playerId: player.playerId }, connectionByPlayerId);
      broadcastRoomState(roomId);
      rooms.pruneEmpty();
    }
  },
});
