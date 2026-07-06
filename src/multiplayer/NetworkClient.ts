// Camada 2 (lado Cliente) — transforma ações locais em eventos de rede
// e repassa eventos do servidor a quem se inscrever. Não conhece
// nenhuma regra do jogo: só (de)serializa e entrega mensagens.
// Usa o WebSocket nativo do navegador — nenhuma dependência nova.

import type { ClientEvent, ServerEvent } from "./protocol";

type Listener = (event: ServerEvent) => void;

export interface NetworkClientOptions {
  url: string;
}

export class NetworkClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly options: NetworkClientOptions) {}

  connect(): void {
    if (this.socket) return;
    const socket = new WebSocket(this.options.url);

    socket.addEventListener("message", (ev) => {
      let event: ServerEvent;
      try {
        event = JSON.parse(ev.data) as ServerEvent;
      } catch {
        return;
      }
      for (const listener of this.listeners) listener(event);
    });

    this.socket = socket;
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
