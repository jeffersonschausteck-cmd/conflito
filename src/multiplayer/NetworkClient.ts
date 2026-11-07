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

/**
 * Inverso de `rehydrateGameState` — usado sempre que um `GameState` já
 * rehidratado (com `blockedTiles` como `Set`) precisa cruzar `JSON`
 * de novo, ex.: `sessionStorage`. Sprint QA-11 — `deployment.tsx`
 * gravava `event.state` (já rehidratado pelo `NetworkClient`) direto
 * via `JSON.stringify`, e um `Set` vira `"{}"` nesse processo — o
 * `blockedTiles` era destruído silenciosamente, e a leitura em
 * `game.tsx` (`rehydrateGameState` com `new Set({})`) lançava
 * `TypeError: object is not iterable`, engolido por um `try/catch`
 * que derrubava o jogador pro modo offline sem aviso nenhum.
 */
export function serializeGameState(state: GameState): GameState {
  return {
    ...state,
    config: {
      ...state.config,
      blockedTiles: [...(state.config.blockedTiles ?? [])] as unknown as GameState["config"]["blockedTiles"],
    },
  };
}

function rehydrateServerEvent(event: ServerEvent): ServerEvent {
  if ("state" in event && event.state) {
    return { ...event, state: rehydrateGameState(event.state) };
  }
  return event;
}

/**
 * Sprint REC-01 — sobrevive a um F5/reload (ao contrário de tudo em
 * `NetworkClient`, que é só memória e some quando o módulo recarrega).
 * Guarda o mínimo pra "religar direto na sala" ao voltar: o roomId e o
 * playerId já emitidos por esta sala (`GameRoom.addPlayer`). Sem isso,
 * `connect()` sempre reabria a conexão de Lobby do zero depois de um
 * reload, e nada nunca disparava um `JoinRoom`/reconexão de volta pra
 * `GameRoom` — a sala ficava pra trás, mesmo com o jogador ainda
 * "dentro" dela do lado do servidor.
 */
const ROOM_SESSION_KEY = "conflito:room-session";

interface SavedRoomSession {
  roomId: string;
  playerId: string;
}

function readSavedRoomSession(): SavedRoomSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ROOM_SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedRoomSession) : null;
  } catch {
    return null;
  }
}

function writeSavedRoomSession(session: SavedRoomSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    window.sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(ROOM_SESSION_KEY);
  }
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
  /** URL do destino atual do socket — usado por `ensureLobbyConnection` para saber se precisa reconectar. */
  private currentUrl: string | null = null;
  /**
   * Sprint QA-09 — uma `GameRoom`/`AccountsRoom` sem tráfego por um
   * tempo pode ser evictada pela Cloudflare (o WebSocket usa o modo
   * padrão, não o de hibernação), fechando o socket do lado do
   * servidor sem nenhum aviso à Interface. Sem ouvir `close`/`error`,
   * `this.socket` continuava apontando pro objeto morto para sempre —
   * `connect()` (`if (this.socket) return`) nunca tentava de novo, e
   * `send()` só descobria o problema (e lançava) na próxima ação do
   * jogador. Reproduzido ao vivo: sala fica ociosa alguns minutos →
   * `readyState` do socket vira `CLOSED` → o outro jogador nunca mais
   * recebe `ActionApplied` desse jogador (parecem partidas separadas).
   */
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: NetworkClientOptions) {}

  connect(): void {
    if (this.socket) return;
    // Sprint REC-01 — um reload novo (singleton recriado do zero, ver
    // `networkSingleton.ts`) não sabe mais que já estava numa sala; sem
    // isso, sempre abria a conexão de Lobby e ficava presa lá até o
    // jogador criar/entrar numa sala de novo. Resume direto na sala se
    // já tiver um `playerId` salvo de uma sessão anterior.
    const saved = readSavedRoomSession();
    if (saved && /\/connect\/?$/.test(this.options.url)) {
      this.playerId = saved.playerId;
      const roomUrl = this.options.url.replace(/\/connect\/?$/, `/room/${saved.roomId}/ws?playerId=${saved.playerId}`);
      this.openSocket(roomUrl);
      return;
    }
    this.openSocket(this.options.url);
  }

  /**
   * Sprint QA-03 — garante que a conexão atual fala com a AccountsRoom
   * (Login/Lobby), não com a GameRoom de uma sala anterior. Sem isso,
   * `connect()` (que só olha `this.socket`) considerava "já conectado"
   * mesmo com o socket apontando para o destino errado depois de
   * `reconnectToRoom` — voltar ao Lobby ficava preso lá, e qualquer
   * ação de sala enviada nunca chegava a lugar nenhum.
   */
  ensureLobbyConnection(): void {
    if (this.socket && this.currentUrl === this.options.url) return;
    this.socket?.close();
    this.socket = null;
    // Sprint REC-01 — voltar ao Lobby de propósito significa "não estou
    // mais retomando aquela sala"; limpa a sessão salva pra `connect()`
    // não tentar resumir uma sala que o jogador já deixou pra trás.
    writeSavedRoomSession(null);
    this.openSocket(this.options.url);
  }

  private openSocket(url: string): void {
    this.intentionalClose = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = new WebSocket(url);
    this.currentUrl = url;

    socket.addEventListener("close", () => this.handleSocketDown(socket));
    socket.addEventListener("error", () => this.handleSocketDown(socket));

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

  /**
   * Chamado quando o socket ATUAL fecha ou falha, seja por queda de rede
   * ou por eviction da Durable Object do lado do servidor. Ignora sockets
   * antigos (já substituídos por `reconnectToRoom`/reconexão anterior) e
   * chamadas de `disconnect()` intencional (ex.: logout). Tenta reabrir
   * no mesmo destino — mesma URL, mesmo `playerId` já embutido nela.
   */
  private handleSocketDown(socket: WebSocket): void {
    if (socket !== this.socket) return;
    this.socket = null;
    if (this.intentionalClose || !this.currentUrl) return;
    if (this.reconnectTimer) return;
    const url = this.currentUrl;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket(url);
    }, 1000);
  }

  /** Fecha a conexão com a AccountsRoom e abre uma nova, direto na GameRoom da sala. */
  private reconnectToRoom(roomId: string): void {
    const roomUrl = this.options.url.replace(/\/connect\/?$/, `/room/${roomId}/ws?playerId=${this.playerId}`);
    // Sprint REC-01 — grava a sala assim que entramos nela de fato, pra
    // sobreviver a um reload (ver `connect()`/`readSavedRoomSession`).
    if (this.playerId) writeSavedRoomSession({ roomId, playerId: this.playerId });
    this.socket?.close();
    this.socket = null;
    this.openSocket(roomUrl);
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    // Sprint REC-01 — logout é uma saída de propósito, igual `ensureLobbyConnection`.
    writeSavedRoomSession(null);
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
