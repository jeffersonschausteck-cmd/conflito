// Camada 2 (lado Cliente) — transforma ações locais em eventos de rede
// e repassa eventos do servidor a quem se inscrever. Não conhece
// nenhuma regra do jogo: só (de)serializa e entrega mensagens.
// Usa o WebSocket nativo do navegador — nenhuma dependência nova.

import type { ClientEvent, ServerEvent } from "./protocol";
import type { GameState } from "@/types/gameState";

type Listener = (event: ServerEvent) => void;

/**
 * `GameState.config.blockedTiles` é um `Set` — `JSON.stringify` de um
 * `Set` produz `"{}"` (perde todo o conteúdo). O servidor manda esse
 * campo como array (ver `GameRoom.ts`/wire serialization). Reconstrói
 * de volta em `Set` — sem isso, `MovementEngine` quebra ao chamar
 * `blockedTiles.has(...)` em qualquer partida online com terreno
 * bloqueado. Não é regra de jogo, só higiene de transporte; exportado
 * porque `game.tsx` precisa da mesma reidratação ao ler o estado
 * salvo em `sessionStorage` (outro ponto onde o `Set` cruza JSON).
 */
export function rehydrateGameState(state: GameState): GameState {
  const rawBlocked = (state.config as unknown as { blockedTiles?: string[] }).blockedTiles;
  return {
    ...state,
    config: {
      ...state.config,
      blockedTiles: new Set(rawBlocked ?? []),
    },
  };
}

function rehydrateServerEvent(event: ServerEvent): ServerEvent {
  if ("state" in event && event.state) {
    return { ...event, state: rehydrateGameState(event.state) };
  }
  return event;
}

export interface NetworkClientOptions {
  url: string;
}

export class NetworkClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  /**
   * Sprint MP-04 — cada sala é uma Durable Object independente: a
   * conexão inicial fala com a `AccountsRoom` (Login/Cadastro/Criar
   * Sala/Entrar Sala); assim que uma sala existe, o cliente troca essa
   * conexão por uma nova, direto na `GameRoom` daquela sala. As telas
   * nunca percebem essa troca — continuam só ouvindo `onEvent`.
   */
  private playerId: string | null = null;

  constructor(private readonly options: NetworkClientOptions) {}

  connect(): void {
    if (this.socket) return;
    this.openSocket(this.options.url);
  }

  private openSocket(url: string): void {
    const socket = new WebSocket(url);

    socket.addEventListener("message", (ev) => {
      let event: ServerEvent;
      try {
        event = rehydrateServerEvent(JSON.parse(ev.data) as ServerEvent);
      } catch {
        return;
      }

      if (event.type === "PlayerConnected") {
        this.playerId = event.playerId;
      }

      // Só reconecta se o servidor atual é o Worker Cloudflare (endpoint
      // `/connect`) — o servidor Bun legado (referência, Sprint MP-04)
      // trata tudo numa única conexão e não tem endpoint de sala por DO.
      if (
        (event.type === "RoomCreated" || event.type === "RoomJoined") &&
        this.playerId &&
        /\/connect\/?$/.test(this.options.url)
      ) {
        this.reconnectToRoom(event.roomId);
      }

      for (const listener of this.listeners) listener(event);
    });

    this.socket = socket;
  }

  /** Fecha a conexão com a AccountsRoom e abre uma nova, direto na GameRoom da sala. */
  private reconnectToRoom(roomId: string): void {
    const roomUrl = this.options.url.replace(/\/connect\/?$/, `/room/${roomId}/ws?playerId=${this.playerId}`);
    this.socket?.close();
    this.socket = null;
    this.openSocket(roomUrl);
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  /** Envia uma intenção do jogador — nunca aplica a regra localmente. */
  send(event: ClientEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("NetworkClient: não conectado ao servidor.");
    }
    this.socket.send(JSON.stringify(event));
  }

  /** Assina eventos vindos do servidor. Retorna uma função para cancelar a assinatura. */
  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
