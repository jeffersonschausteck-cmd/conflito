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

/** Comparação de texto em tempo constante (mesmo tamanho já checado antes). */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(ACCOUNTS_INSTANCE));
      return stub.fetch(request);
    }

    // Estatísticas do dono: desligada sem STATS_KEY; com ela, exige `Authorization: Bearer <chave>`. Só números agregados.
    if ((url.pathname === "/stats" || url.pathname === "/stats/accounts") && request.method === "GET") {
      const key = env.STATS_KEY;
      const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!key || !given || given.length !== key.length || !timingSafeEqual(given, key)) {
        return new Response("Não encontrado", { status: 404 });
      }
      const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(ACCOUNTS_INSTANCE));
      const res = await stub.fetch(url.pathname === "/stats/accounts" ? "https://internal/internal/export-accounts" : "https://internal/internal/stats");
      return new Response(res.body, { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    }

    // Aprendizado da IA (docs/09-IA.md, 1.3): só agregados anônimos por modo, leitura pública para a Campanha.
    const learningMatch = url.pathname.match(/^\/learning\/(blitz|rapid|classic)$/);
    if (learningMatch && request.method === "GET") {
      const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(ACCOUNTS_INSTANCE));
      const res = await stub.fetch(`https://internal/internal/get-learning?pace=${learningMatch[1]}`);
      return new Response(res.body, {
        status: res.status,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=300" },
      });
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
