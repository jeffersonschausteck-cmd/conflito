// Camada 2 — instância única do NetworkClient compartilhada entre as
// telas do fluxo online (login, lobby, sala de espera, posicionamento,
// partida). Não é um Provider React porque `NetworkClient` já é
// independente de framework — só precisa sobreviver à navegação entre
// rotas dentro da mesma aba.

import { NetworkClient } from "./NetworkClient";

const WS_URL =
  (typeof window !== "undefined" && (window as any).__CONFLITO_WS_URL__) ||
  "ws://localhost:8787/ws";

let client: NetworkClient | null = null;

export function getNetworkClient(): NetworkClient {
  if (!client) {
    client = new NetworkClient({ url: WS_URL });
  }
  return client;
}

export function ensureConnected(): NetworkClient {
  const c = getNetworkClient();
  c.connect();
  return c;
}
