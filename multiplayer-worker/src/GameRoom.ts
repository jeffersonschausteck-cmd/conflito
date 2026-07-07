// Camada 3 — Durable Object "GameRoom": UMA instância por sala
// (Sprint MP-04 — "cada sala é um Durable Object independente").
//
// Porta direta de `server/src/Room.ts` + `server/src/GameSession.ts` +
// `server/src/ConnectionManager.ts` (agora escopado só aos 2
// jogadores desta sala) para o runtime de Durable Objects. Nenhuma
// regra de jogo muda — `GameSession` continua chamando só
// `GameEngine.reduce`, exatamente como antes.

import { DurableObject } from "cloudflare:workers";
import { acceptWebSocket, type TransportConnection } from "./durableTransport";
import { GameEngine } from "@/services/gameEngine";
import { ownerToPlayer } from "@/types/gameState";
import { DeploymentManager } from "@/services/deploymentManager";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import type { GameAction, GameState, Player } from "@/types/gameState";
import type { Piece, PlayerOwner } from "@/types/piece";
import type {
  ClientEvent,
  PlayerId,
  RoomPlayerInfo,
  RoomStatus,
  ServerEvent,
} from "@/multiplayer/protocol";
import type { Env } from "./env";

const BLOCKED_TILES = getBlockedTiles(ACTIVE_MAP);

/** Idêntico a `GameSession` original — única ponte com o Motor do Jogo. */
class GameSession {
  private state: GameState;

  constructor(initialPieces?: Piece[]) {
    this.state = GameEngine.createInitialState({
      rows: ACTIVE_MAP.rows,
      cols: ACTIVE_MAP.cols,
      blockedTiles: getBlockedTiles(ACTIVE_MAP),
    });
    if (initialPieces) {
      this.state = { ...this.state, pieces: initialPieces };
    }
  }

  getState(): GameState {
    return this.state;
  }

  applyAction(owner: PlayerOwner, action: GameAction) {
    if (this.state.gameOver) {
      return { ok: false as const, state: this.state, reason: "A partida já foi encerrada." };
    }
    const TURN_ACTIONS = new Set(["SELECT_PIECE", "MOVE_SELECTED", "END_TURN"]);
    if (TURN_ACTIONS.has(action.type) && ownerToPlayer(owner) !== this.state.currentPlayer) {
      return { ok: false as const, state: this.state, reason: "Não é o seu turno." };
    }
    const before = this.state;
    const next = GameEngine.reduce(before, action);
    if (next === before) {
      return { ok: false as const, state: before, reason: "Ação inválida ou fora de turno." };
    }
    this.state = next;
    return { ok: true as const, state: next };
  }

  winner(): Player | null {
    return this.state.winner;
  }
}

interface RoomPlayer extends RoomPlayerInfo {}

interface ConnectedEntry {
  conn: TransportConnection;
  playerId: PlayerId;
}

export class GameRoom extends DurableObject<Env> {
  private status: RoomStatus = "waiting";
  private session: GameSession | null = null;
  private players: RoomPlayer[] = [];
  private readyPlayers = new Set<PlayerId>();
  private deployments = new Map<PlayerId, Piece[]>();
  private connectionsByPlayer = new Map<PlayerId, TransportConnection>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint interno — só a AccountsRoom chama isso (DO-to-DO), nunca o cliente.
    if (url.pathname.endsWith("/internal/add-player") && request.method === "POST") {
      const body = (await request.json()) as { playerId: string; playerName: string };
      const result = this.addPlayer(body.playerId, body.playerName);
      // Avisa quem já estiver conectado a esta sala (ex.: quem a criou)
      // que um novo jogador entrou — equivalente ao antigo
      // `broadcastRoomState` chamado depois de CreateRoom/JoinRoom.
      if (result.ok) this.broadcastRoomState(this.ctx.id.toString());
      return Response.json(result);
    }

    // O Worker (`index.ts`) repassa a requisição original sem reescrever o
    // path (`/room/:id/ws`) — aqui dentro basta confirmar que é um upgrade
    // de WebSocket, a instância já é a sala certa (roteada por `idFromName`).
    if (url.pathname.endsWith("/ws")) {
      const playerId = url.searchParams.get("playerId") ?? "";
      if (!this.ownerOf(playerId)) {
        return new Response("Jogador não pertence a esta sala.", { status: 403 });
      }
      return acceptWebSocket(request, {
        onConnect: (conn) => this.handleConnect(conn, playerId),
        onMessage: (conn, data) => this.handleMessage(conn, playerId, data),
        onClose: (conn) => this.handleClose(conn, playerId),
      });
    }

    return new Response("Conflito GameRoom", { status: 200 });
  }

  // ── Ciclo da sala (idêntico a Room.ts) ──────────────────────────

  private addPlayer(playerId: PlayerId, playerName: string) {
    if (this.isFull()) {
      return { ok: false as const, reason: "Sala já está cheia." };
    }
    const owner: PlayerOwner = this.players.length === 0 ? "blue" : "red";
    const player: RoomPlayer = { playerId, playerName, owner };
    this.players.push(player);
    if (this.isFull()) this.status = "ready";
    return { ok: true as const, player, players: this.players, status: this.status };
  }

  private isFull(): boolean {
    return this.players.length >= 2;
  }

  private ownerOf(playerId: PlayerId): PlayerOwner | null {
    return this.players.find((p) => p.playerId === playerId)?.owner ?? null;
  }

  private removePlayer(playerId: PlayerId): void {
    this.players = this.players.filter((p) => p.playerId !== playerId);
    this.readyPlayers.delete(playerId);
    this.deployments.delete(playerId);
    if (this.status !== "waiting") this.status = "finished";
  }

  private markReady(playerId: PlayerId): { ok: boolean; reason?: string } {
    if (this.status !== "ready") {
      return { ok: false, reason: "A sala não está aguardando confirmação de prontidão." };
    }
    if (!this.ownerOf(playerId)) {
      return { ok: false, reason: "Jogador não pertence a esta sala." };
    }
    this.readyPlayers.add(playerId);
    if (this.readyPlayers.size >= 2) this.status = "deployment";
    return { ok: true };
  }

  private confirmDeployment(playerId: PlayerId, pieces: Piece[]): { ok: boolean; reason?: string } {
    if (this.status !== "deployment") {
      return { ok: false, reason: "A sala não está na fase de posicionamento." };
    }
    const owner = this.ownerOf(playerId);
    if (!owner) return { ok: false, reason: "Jogador não pertence a esta sala." };

    const isValid = DeploymentManager.validateDeployment(pieces, ACTIVE_MAP.rows, ACTIVE_MAP.cols, BLOCKED_TILES, owner);
    if (!isValid) return { ok: false, reason: "Posicionamento inválido." };

    this.deployments.set(playerId, pieces);
    if (this.deployments.size >= 2) {
      const allPieces = [...this.deployments.values()].flat();
      this.session = new GameSession(allPieces);
      this.status = "playing";
    }
    return { ok: true };
  }

  private applyAction(playerId: PlayerId, action: GameAction) {
    if (!this.session) return { ok: false as const, reason: "A partida ainda não começou." };
    const owner = this.ownerOf(playerId);
    if (!owner) return { ok: false as const, reason: "Jogador não pertence a esta sala." };
    const result = this.session.applyAction(owner, action);
    if (result.state.gameOver) this.status = "finished";
    return result;
  }

  // ── Transporte / eventos de rede ────────────────────────────────

  /**
   * `GameState.config.blockedTiles` é um `Set` — `JSON.stringify` de um
   * `Set` produz `"{}"` (perde o conteúdo). Serializa como array antes
   * de enviar; `NetworkClient.rehydrateGameState` reconstrói o `Set` do
   * lado do cliente. Puro transporte, nenhuma regra de jogo envolvida.
   */
  private send(conn: TransportConnection, event: ServerEvent): void {
    const wireEvent =
      "state" in event && event.state
        ? {
            ...event,
            state: {
              ...event.state,
              config: {
                ...event.state.config,
                blockedTiles: [...(event.state.config.blockedTiles ?? [])],
              },
            },
          }
        : event;
    conn.send(JSON.stringify(wireEvent));
  }

  private broadcast(event: ServerEvent): void {
    for (const player of this.players) {
      const conn = this.connectionsByPlayer.get(player.playerId);
      if (conn) this.send(conn, event);
    }
  }

  private broadcastRoomState(roomId: string): void {
    this.broadcast({
      type: "RoomStateChanged",
      roomId,
      status: this.status,
      players: this.players,
      readyPlayerIds: [...this.readyPlayers],
      deployedPlayerIds: [...this.deployments.keys()],
    });
  }

  private handleConnect(conn: TransportConnection, playerId: PlayerId): void {
    this.connectionsByPlayer.set(playerId, conn);
    // Envia o estado atual da sala assim que a conexão abre — evita uma
    // corrida onde o outro jogador entra/fica pronto bem no instante em
    // que este socket ainda está subindo e perderia esse broadcast.
    this.send(conn, {
      type: "RoomStateChanged",
      roomId: this.ctx.id.toString(),
      status: this.status,
      players: this.players,
      readyPlayerIds: [...this.readyPlayers],
      deployedPlayerIds: [...this.deployments.keys()],
    });
  }

  private handleClose(_conn: TransportConnection, playerId: PlayerId): void {
    this.connectionsByPlayer.delete(playerId);
    if (this.ownerOf(playerId)) {
      const roomId = this.ctx.id.toString();
      this.removePlayer(playerId);
      this.broadcast({ type: "PlayerDisconnected", playerId });
      this.broadcastRoomState(roomId);
    }
  }

  private handleMessage(conn: TransportConnection, playerId: PlayerId, raw: string): void {
    const roomId = this.ctx.id.toString();
    let event: ClientEvent;
    try {
      event = JSON.parse(raw) as ClientEvent;
    } catch {
      this.send(conn, { type: "ActionRejected", reason: "Mensagem inválida." });
      return;
    }

    switch (event.type) {
      case "LeaveRoom": {
        this.removePlayer(playerId);
        this.connectionsByPlayer.delete(playerId);
        this.broadcastRoomState(roomId);
        break;
      }

      case "PlayerReady": {
        const result = this.markReady(playerId);
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Não foi possível confirmar." });
          break;
        }
        this.broadcastRoomState(roomId);
        break;
      }

      case "ConfirmDeployment": {
        const result = this.confirmDeployment(playerId, event.pieces);
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Posicionamento inválido." });
          break;
        }
        this.broadcastRoomState(roomId);
        if (this.status === "playing" && this.session) {
          this.broadcast({ type: "GameStarted", state: this.session.getState() });
        }
        break;
      }

      case "SelectPiece":
      case "MovePiece":
      case "EndTurn": {
        const action: GameAction =
          event.type === "SelectPiece"
            ? { type: "SELECT_PIECE", pieceId: event.pieceId }
            : event.type === "MovePiece"
              ? { type: "MOVE_SELECTED", row: event.row, column: event.column }
              : { type: "END_TURN" };

        const result = this.applyAction(playerId, action);
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Ação inválida." });
          break;
        }
        if (result.state.gameOver && result.state.winner) {
          this.broadcast({ type: "GameFinished", winner: result.state.winner, state: result.state });
        } else {
          this.broadcast({ type: "ActionApplied", state: result.state, appliedBy: playerId });
        }
        break;
      }

      default:
        break;
    }
  }
}
