// Camada 3 — abstração de transporte.
//
// Nenhuma regra de jogo e nenhum conceito de "sala"/"jogador" mora
// aqui — só a mecânica crua de aceitar conexões e trocar mensagens.
// Trocar de host no futuro (Cloudflare Durable Objects, outro
// provedor) significa escrever um novo adapter que implemente esta
// mesma interface — `ConnectionManager`/`RoomManager`/`GameSession`
// nunca precisam mudar.

export type ConnectionId = string;

export interface TransportConnection {
  id: ConnectionId;
  send(data: string): void;
  close(): void;
}

export interface TransportHandlers {
  onConnect(conn: TransportConnection): void;
  onMessage(conn: TransportConnection, data: string): void;
  onClose(conn: TransportConnection): void;
}

export interface Transport {
  start(handlers: TransportHandlers): void;
  stop(): void;
}

/**
 * Implementação concreta usando o servidor WebSocket nativo do Bun
 * (`Bun.serve`) — zero dependências novas, já que o projeto roda em
 * Bun. Serve só de referência/desenvolvimento local; produção pode
 * trocar por outro adapter atrás da mesma `Transport`.
 */
export class BunWebSocketTransport implements Transport {
  private server: ReturnType<typeof Bun.serve> | null = null;
  private connections = new Map<ConnectionId, TransportConnection>();

  constructor(private readonly port: number) {}

  start(handlers: TransportHandlers): void {
    const connections = this.connections;

    this.server = Bun.serve({
      port: this.port,
      fetch(req, server) {
        const url = new URL(req.url);
        if (url.pathname !== "/ws") {
          return new Response("Conflito multiplayer server", { status: 200 });
        }
        const id = crypto.randomUUID();
        const upgraded = server.upgrade(req, { data: { id } });
        if (!upgraded) {
          return new Response("WebSocket upgrade failed", { status: 400 });
        }
        return undefined;
      },
      websocket: {
        open(ws) {
          const id = (ws.data as { id: ConnectionId }).id;
          const conn: TransportConnection = {
            id,
            send: (data) => ws.send(data),
            close: () => ws.close(),
          };
          connections.set(id, conn);
          handlers.onConnect(conn);
        },
        message(ws, message) {
          const id = (ws.data as { id: ConnectionId }).id;
          const conn = connections.get(id);
          if (!conn) return;
          handlers.onMessage(conn, message.toString());
        },
        close(ws) {
          const id = (ws.data as { id: ConnectionId }).id;
          const conn = connections.get(id);
          connections.delete(id);
          if (conn) handlers.onClose(conn);
        },
      },
    });

    console.log(`[conflito-server] WebSocket ouvindo em ws://localhost:${this.port}/ws`);
  }

  stop(): void {
    this.server?.stop();
    this.connections.clear();
  }
}
