// Camada 3 — bootstrap do Worker (Sprint MP-04).
//
// Substitui `server/src/index.ts` (Bun.serve). Só roteia o upgrade de
// WebSocket para a Durable Object certa — `/connect` sempre vai para a
// única instância de `AccountsRoom` (Login/Cadastro/Criar Sala/Entrar
// Sala); `/room/:id/ws` vai para a `GameRoom` daquela sala específica
// (uma Durable Object por sala). Nenhuma regra de jogo vive aqui.

import { AccountsRoom } from "./AccountsRoom";
import { GameRoom } from "./GameRoom";
import type { Env } from "./env";

export { AccountsRoom, GameRoom };

const ACCOUNTS_INSTANCE = "global";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(ACCOUNTS_INSTANCE));
      return stub.fetch(request);
    }

    const roomMatch = url.pathname.match(/^\/room\/([^/]+)\/ws$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
      return stub.fetch(request);
    }

    return new Response("Conflito multiplayer worker", { status: 200 });
  },
};
