// Camada 2 — instância única do NetworkClient compartilhada entre as
// telas do fluxo online (login, lobby, sala de espera, posicionamento,
// partida). Não é um Provider React porque `NetworkClient` já é
// independente de framework — só precisa sobreviver à navegação entre
// rotas dentro da mesma aba.

import { NetworkClient } from "./NetworkClient";

// Sprint MP-06 — a variável de build `VITE_MULTIPLAYER_WS_URL` não
// chega ao build publicado (nenhum `.env` existe no pipeline de
// deploy), então o fallback caía sempre em `ws://localhost:8787/ws`
// mesmo em produção. Correção: o fallback de produção agora aponta
// direto para o Worker Cloudflare; `localhost` só é usado em
// desenvolvimento local (`import.meta.env.DEV`, injetado pelo próprio
// Vite — nunca verdadeiro num build publicado). `VITE_MULTIPLAYER_WS_URL`
// e `window.__CONFLITO_WS_URL__` continuam funcionando como override,
// caso a URL do Worker mude no futuro sem precisar mexer no código.
const PRODUCTION_WS_URL = "wss://conflito-multiplayer.jefinhoschaus50.workers.dev/connect";
const LOCAL_DEV_WS_URL = "ws://localhost:8787/ws";

const WS_URL =
  (typeof window !== "undefined" && (window as any).__CONFLITO_WS_URL__) ||
  import.meta.env.VITE_MULTIPLAYER_WS_URL ||
  (import.meta.env.DEV ? LOCAL_DEV_WS_URL : PRODUCTION_WS_URL);

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
