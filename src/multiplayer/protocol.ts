// Camada 2 — contrato único de eventos de rede (Cliente <-> Servidor).
//
// Este arquivo não contém nenhuma regra de jogo — só os "envelopes"
// que carregam intenções do jogador até o servidor e o novo estado
// autoritativo de volta. É importado tanto pelo cliente
// (`src/multiplayer/NetworkClient.ts`) quanto pelo servidor
// (`server/src/*`), garantindo que os dois lados nunca divirjam sobre
// o formato dos eventos.

import type { GameState, Player } from "@/types/gameState";
import type { Piece, PieceId } from "@/types/piece";

export type RoomId = string;
export type PlayerId = string;

/** Estados possíveis de uma sala (fluxo oficial — doc 10). */
export type RoomStatus = "waiting" | "ready" | "deployment" | "playing" | "finished";

// ─────────────────────────────────────────────────────────────────
// Cliente → Servidor
// ─────────────────────────────────────────────────────────────────

export type ClientEvent =
  // Sistema de Contas (doc 16) — obrigatório para qualquer ação abaixo.
  | { type: "Register"; nickname: string; email: string; password: string }
  | { type: "Login"; nickname: string; password: string }
  | { type: "Logout" }
  | { type: "CreateRoom"; playerName?: string }
  | { type: "JoinRoom"; roomId: RoomId; playerName?: string }
  | { type: "LeaveRoom" }
  | { type: "PlayerReady" }
  | { type: "ConfirmDeployment"; pieces: Piece[] }
  | { type: "SelectPiece"; pieceId: PieceId | null }
  | { type: "MovePiece"; row: number; column: number }
  | { type: "EndTurn" };

// ─────────────────────────────────────────────────────────────────
// Servidor → Cliente
// ─────────────────────────────────────────────────────────────────

export interface RoomPlayerInfo {
  playerId: PlayerId;
  playerName: string;
  owner: "blue" | "red";
}

/** Perfil público devolvido após Register/Login — nunca inclui senha/hash. */
export interface AuthenticatedProfile {
  accountId: string;
  nickname: string;
  createdAt: number;
}

export type ServerEvent =
  | { type: "AuthSuccess"; token: string; profile: AuthenticatedProfile }
  | { type: "AuthError"; reason: string }
  | { type: "PlayerConnected"; playerId: PlayerId }
  | { type: "PlayerDisconnected"; playerId: PlayerId }
  | { type: "RoomCreated"; roomId: RoomId; you: RoomPlayerInfo }
  | { type: "RoomJoined"; roomId: RoomId; you: RoomPlayerInfo; players: RoomPlayerInfo[] }
  /**
   * Disparado sempre que a sala muda de fase (jogador entrou, ficou
   * pronto, confirmou o posicionamento) — a Interface usa isso para
   * decidir para qual tela avançar, sem nunca reconstruir esse estado
   * sozinha (doc 10).
   */
  | {
      type: "RoomStateChanged";
      roomId: RoomId;
      status: RoomStatus;
      players: RoomPlayerInfo[];
      readyPlayerIds: PlayerId[];
      deployedPlayerIds: PlayerId[];
    }
  | { type: "GameStarted"; state: GameState }
  /**
   * Envelope único para qualquer ação validada pelo Motor
   * (MovePiece/SelectPiece/EndTurn) — sempre carrega o `GameState`
   * completo e novo, nunca um diff. O cliente nunca reconstrói o
   * estado sozinho (doc 10).
   */
  | { type: "ActionApplied"; state: GameState; appliedBy: PlayerId }
  | { type: "GameFinished"; winner: Player; state: GameState }
  | { type: "ActionRejected"; reason: string };

export interface RoomSnapshot {
  roomId: RoomId;
  players: RoomPlayerInfo[];
  state: GameState | null;
}
