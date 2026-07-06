// Camada 3 — "Estrutura da partida" / "Estrutura das salas".
//
// Uma Room representa uma partida online e percorre o fluxo oficial
// (doc 10): waiting -> ready -> deployment -> playing -> finished.
// Não fala com o transporte diretamente — quem chama decide como
// notificar os clientes (ver `RoomManager`/`index.ts`).

import { GameSession } from "./GameSession";
import { DeploymentManager } from "@/services/deploymentManager";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import type { GameAction } from "@/types/gameState";
import type { Piece, PlayerOwner } from "@/types/piece";
import type { PlayerId, RoomId, RoomPlayerInfo, RoomStatus } from "@/multiplayer/protocol";

export interface RoomPlayer extends RoomPlayerInfo {}

export interface HistoryEntry {
  playerId: PlayerId;
  action: GameAction;
  at: number;
}

const BLOCKED_TILES = getBlockedTiles(ACTIVE_MAP);

export class Room {
  readonly id: RoomId;
  readonly createdAt = Date.now();
  status: RoomStatus = "waiting";
  session: GameSession | null = null;
  private players: RoomPlayer[] = [];
  private history: HistoryEntry[] = [];
  private readyPlayers = new Set<PlayerId>();
  private deployments = new Map<PlayerId, Piece[]>();

  constructor(id: RoomId) {
    this.id = id;
  }

  getPlayers(): RoomPlayer[] {
    return this.players;
  }

  isFull(): boolean {
    return this.players.length >= 2;
  }

  getReadyPlayerIds(): PlayerId[] {
    return [...this.readyPlayers];
  }

  getDeployedPlayerIds(): PlayerId[] {
    return [...this.deployments.keys()];
  }

  /** Primeiro jogador vira Azul, segundo vira Vermelho (doc 05 — sem vantagem entre facções). */
  addPlayer(playerId: PlayerId, playerName: string): RoomPlayer {
    const owner: PlayerOwner = this.players.length === 0 ? "blue" : "red";
    const player: RoomPlayer = { playerId, playerName, owner };
    this.players.push(player);

    if (this.isFull()) {
      this.status = "ready";
    }

    return player;
  }

  removePlayer(playerId: PlayerId): void {
    this.players = this.players.filter((p) => p.playerId !== playerId);
    this.readyPlayers.delete(playerId);
    this.deployments.delete(playerId);
    if (this.status !== "waiting") {
      this.status = "finished";
    }
  }

  ownerOf(playerId: PlayerId): PlayerOwner | null {
    return this.players.find((p) => p.playerId === playerId)?.owner ?? null;
  }

  /** "Ambos clicam em Pronto" — avança de `ready` para `deployment`. */
  markReady(playerId: PlayerId): { ok: boolean; reason?: string } {
    if (this.status !== "ready") {
      return { ok: false, reason: "A sala não está aguardando confirmação de prontidão." };
    }
    if (!this.ownerOf(playerId)) {
      return { ok: false, reason: "Jogador não pertence a esta sala." };
    }
    this.readyPlayers.add(playerId);
    if (this.readyPlayers.size >= 2) {
      this.status = "deployment";
    }
    return { ok: true };
  }

  /** "Ambos confirmam o posicionamento" — avança de `deployment` para `playing`. */
  confirmDeployment(playerId: PlayerId, pieces: Piece[]): { ok: boolean; reason?: string } {
    if (this.status !== "deployment") {
      return { ok: false, reason: "A sala não está na fase de posicionamento." };
    }
    const owner = this.ownerOf(playerId);
    if (!owner) {
      return { ok: false, reason: "Jogador não pertence a esta sala." };
    }

    const isValid = DeploymentManager.validateDeployment(
      pieces,
      ACTIVE_MAP.rows,
      ACTIVE_MAP.cols,
      BLOCKED_TILES,
      owner,
    );
    if (!isValid) {
      return { ok: false, reason: "Posicionamento inválido." };
    }

    this.deployments.set(playerId, pieces);

    if (this.deployments.size >= 2) {
      const allPieces = [...this.deployments.values()].flat();
      this.session = new GameSession(allPieces);
      this.status = "playing";
    }

    return { ok: true };
  }

  applyAction(playerId: PlayerId, action: GameAction) {
    if (!this.session) {
      return { ok: false as const, reason: "A partida ainda não começou." };
    }
    const owner = this.ownerOf(playerId);
    if (!owner) {
      return { ok: false as const, reason: "Jogador não pertence a esta sala." };
    }

    const result = this.session.applyAction(owner, action);
    this.history.push({ playerId, action, at: Date.now() });

    if (result.state.gameOver) {
      this.status = "finished";
    }

    return result;
  }

  getHistory(): ReadonlyArray<HistoryEntry> {
    return this.history;
  }
}
