// Camada 3 — abstração de transporte (Cloudflare Durable Objects).
//
// Equivalente ao antigo `server/src/transport.ts` (Bun.serve), agora
// usando o par nativo `WebSocketPair` da Cloudflare. Nenhuma regra de
// jogo ou conceito de "sala"/"conta" mora aqui — só a mecânica crua de
// aceitar upgrades e trocar mensagens, igual antes.

export interface TransportConnection {
  id: string;
  send(data: string): void;
  close(): void;
}

export interface TransportHandlers {
  onConnect(conn: TransportConnection): void;
  onMessage(conn: TransportConnection, data: string): void;
  onClose(conn: TransportConnection): void;
}

/**
 * Aceita um upgrade de WebSocket recebido pelo `fetch` de uma Durable
 * Object e liga os eventos do socket aos mesmos `TransportHandlers`
 * que o resto do Multiplayer já conhece (Camada 2/3 inalteradas).
 */
export function acceptWebSocket(request: Request, handlers: TransportHandlers): Response {
  if (request.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

  const id = crypto.randomUUID();
  const conn: TransportConnection = {
    id,
    send: (data) => server.send(data),
    close: () => server.close(),
  };

  server.accept();
  handlers.onConnect(conn);

  server.addEventListener("message", (ev) => {
    const data = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer);
    handlers.onMessage(conn, data);
  });

  server.addEventListener("close", () => {
    handlers.onClose(conn);
  });

  server.addEventListener("error", () => {
    handlers.onClose(conn);
  });

  return new Response(null, { status: 101, webSocket: client });
}
