// Camada 3 — Durable Object "GameRoom": UMA instância por sala
// (Sprint MP-04 — "cada sala é um Durable Object independente").
//
// Porta direta de `server/src/Room.ts` + `server/src/GameSession.ts` +
// `server/src/ConnectionManager.ts` (agora escopado só aos 2
// jogadores desta sala) para o runtime de Durable Objects. Nenhuma
// regra de jogo muda — `GameSession` continua chamando só
// `GameEngine.reduce`, exatamente como antes.
//
// Sprint QA-03 — `status`/`players`/`readyPlayers`/`deployments`/
// estado da partida viviam só em memória: se a sala ficasse sem
// nenhuma conexão ativa por um tempo (ex.: entre o CreateRoom e o
// cliente reconectar de fato nesta Durable Object), a Cloudflare pode
// evictá-la, perdendo quem já tinha entrado — reproduzido manualmente
// (o segundo jogador virava "azul", como se fosse o primeiro).
// Persistido via `ctx.storage` — sobrevive a uma eviction.

import { DurableObject } from "cloudflare:workers";
import { acceptWebSocket, type TransportConnection } from "./durableTransport";
import { GameEngine } from "@/services/gameEngine";
import { ownerToPlayer } from "@/types/gameState";
import { DeploymentManager, DEPLOYMENT_DURATION_MS } from "@/services/deploymentManager";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import type { GameAction, GameState, Player } from "@/types/gameState";
import type { Piece, PlayerOwner } from "@/types/piece";
import { sanitizeSkins, type SkinTable } from "@/config/skinCatalog";
import type {
  ClientEvent,
  PlayerId,
  RoomPlayerInfo,
  RoomStatus,
  ServerEvent,
} from "@/multiplayer/protocol";
import type { MatchRecord, MatchType, RankingResultView } from "@/types/ranking";
import type { Env } from "./env";

const BLOCKED_TILES = getBlockedTiles(ACTIVE_MAP);

/**
 * Sprint REC-01 — janela de tolerância pra reconexão depois que a
 * Partida já começou (fase "deployment" ou "playing"). Antes disso
 * (sala "waiting"/"ready"), uma desconexão libera a vaga na hora, como
 * sempre foi — não faz sentido segurar um lugar numa sala que ainda
 * nem tem os dois jogadores prontos.
 */
const RECONNECT_GRACE_MS = 3 * 60 * 1000;

/** Idêntico a `GameSession` original — única ponte com o Motor do Jogo. */
class GameSession {
  private state: GameState;

  constructor(initialPieces?: Piece[]) {
    this.state = GameEngine.createInitialState({
      rows: ACTIVE_MAP.rows,
      cols: ACTIVE_MAP.cols,
      blockedTiles: getBlockedTiles(ACTIVE_MAP),
    });
    if (initialPieces) {
      this.state = { ...this.state, pieces: initialPieces };
    }
  }

  getState(): GameState {
    return this.state;
  }

  /** Restaura uma sessão a partir de um `GameState` já existente (persistência) — nenhuma regra nova, só reatribuição direta. */
  static fromState(state: GameState): GameSession {
    const session = new GameSession();
    session.state = state;
    return session;
  }

  applyAction(owner: PlayerOwner, action: GameAction) {
    if (this.state.gameOver) {
      return { ok: false as const, state: this.state, reason: "A partida já foi encerrada." };
    }
    const TURN_ACTIONS = new Set(["SELECT_PIECE", "MOVE_SELECTED", "END_TURN"]);
    if (TURN_ACTIONS.has(action.type) && ownerToPlayer(owner) !== this.state.currentPlayer) {
      return { ok: false as const, state: this.state, reason: "Não é o seu turno." };
    }
    const before = this.state;
    const next = GameEngine.reduce(before, action);
    if (next === before) {
      return { ok: false as const, state: before, reason: "Ação inválida ou fora de turno." };
    }
    this.state = next;
    return { ok: true as const, state: next };
  }

  winner(): Player | null {
    return this.state.winner;
  }
}

interface RoomPlayer extends RoomPlayerInfo {}

interface ConnectedEntry {
  conn: TransportConnection;
  playerId: PlayerId;
}

/** Formato salvo em `ctx.storage` — `Set`/`Map` e o `Set` de `blockedTiles` viram arrays (mesma higiene de transporte já usada no `send()`). */
interface PersistedRoom {
  roomId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  readyPlayerIds: PlayerId[];
  deployments: [PlayerId, Piece[]][];
  gameState: (Omit<GameState, "config"> & { config: Omit<GameState["config"], "blockedTiles"> & { blockedTiles: string[] } }) | null;
  /** Sprint TIMER-01 — timestamps oficiais (epoch ms), únicos pros dois jogadores. */
  deploymentDeadline: number | null;
  matchStartTime: number | null;
  matchEndTime: number | null;
  /** Sprint REC-01 — quem está desconectado agora e até quando pode voltar. */
  disconnectedPlayerId: PlayerId | null;
  disconnectDeadline: number | null;
  /** Sprint RANKING-01 — tipo da sala (hoje sempre "casual" pras salas por código) e o matchId único gerado quando a Partida começa (`null` antes disso). */
  matchType: MatchType;
  matchId: string | null;
  /** Sprint RANKING-01 — o `AccountsRoom` já processou esse `matchId`? Evita reprocessar Rating se `finalizeMatch` for chamado mais de uma vez pro mesmo resultado. */
  rankingProcessed: boolean;
  /** Oficina do Exército — visual (já validado) de cada jogador. Só aparência. */
  skins?: [PlayerId, SkinTable][];
}

const ROOM_STORAGE_KEY = "room";

export class GameRoom extends DurableObject<Env> {
  /**
   * Sprint QA-07 — roomId CANÔNICO da sala: o código curto (ex.:
   * "6f2e90f2"), o mesmo que `CreateRoom`/`JoinRoom` já devolvem ao
   * cliente. Antes, `RoomStateChanged`/etc. mandavam
   * `this.ctx.id.toString()` (o ID interno de 64 caracteres da
   * Durable Object) — nunca batia com o roomId curto que a Interface
   * guarda (`flow.onlineRoomId`), então `waiting-room.tsx` descartava
   * todo evento em silêncio. Recebido da `AccountsRoom` (que já sabe o
   * roomId curto) no primeiro `/internal/add-player`, e persistido
   * junto do resto do estado da sala — a Durable Object nunca mais
   * expõe seu próprio ID interno para nenhuma tela.
   */
  private roomId = "";
  private status: RoomStatus = "waiting";
  private session: GameSession | null = null;
  private players: RoomPlayer[] = [];
  private readyPlayers = new Set<PlayerId>();
  private deployments = new Map<PlayerId, Piece[]>();
  private connectionsByPlayer = new Map<PlayerId, TransportConnection>();
  private loaded = false;
  /** Sprint TIMER-01 — prazo (epoch ms) do fim da fase de Posicionamento. `null` fora dessa fase. */
  private deploymentDeadline: number | null = null;
  /** Sprint TIMER-01 — instante (epoch ms) em que a `GameSession` foi criada. */
  private matchStartTime: number | null = null;
  /** Sprint TIMER-01 — instante (epoch ms) em que `gameOver` virou verdadeiro. */
  private matchEndTime: number | null = null;
  /** Sprint REC-01 — jogador atualmente desconectado (dentro da janela de tolerância), ou `null` se ambos conectados. */
  private disconnectedPlayerId: PlayerId | null = null;
  /** Sprint REC-01 — prazo (epoch ms) pro jogador acima reconectar antes do W.O. */
  private disconnectDeadline: number | null = null;
  /** Sprint RANKING-01 — Direcionamento Oficial #5/#6: toda sala por código nasce "casual" e nunca altera Rating. */
  private matchType: MatchType = "casual";
  /** Sprint RANKING-01 — gerado uma única vez quando a `GameSession` é criada (`confirmDeployment`); identifica esta partida pro `AccountsRoom` de forma idempotente. */
  private matchId: string | null = null;
  private rankingProcessed = false;
  /** Visual escolhido por cada jogador (sempre passado por `sanitizeSkins`). */
  private skinsByPlayer = new Map<PlayerId, SkinTable>();

  /** Carrega o snapshot persistido (se existir) uma única vez por instância. */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const stored = await this.ctx.storage.get<PersistedRoom>(ROOM_STORAGE_KEY);
    if (stored) {
      this.roomId = stored.roomId;
      this.status = stored.status;
      this.players = stored.players;
      this.readyPlayers = new Set(stored.readyPlayerIds);
      this.deployments = new Map(stored.deployments);
      this.session = stored.gameState
        ? GameSession.fromState({
            ...stored.gameState,
            config: { ...stored.gameState.config, blockedTiles: new Set(stored.gameState.config.blockedTiles) },
          } as GameState)
        : null;
      this.deploymentDeadline = stored.deploymentDeadline ?? null;
      this.matchStartTime = stored.matchStartTime ?? null;
      this.matchEndTime = stored.matchEndTime ?? null;
      this.disconnectedPlayerId = stored.disconnectedPlayerId ?? null;
      this.disconnectDeadline = stored.disconnectDeadline ?? null;
      this.matchType = stored.matchType ?? "casual";
      this.matchId = stored.matchId ?? null;
      this.rankingProcessed = stored.rankingProcessed ?? false;
      this.skinsByPlayer = new Map((stored.skins ?? []).map(([id, t]) => [id, sanitizeSkins(t)]));
    }
    this.loaded = true;
  }

  /** Salva o snapshot atual — chamado depois de toda mutação (entrar, pronto, posicionar, jogar). */
  private async persist(): Promise<void> {
    const gameState = this.session?.getState() ?? null;
    const persisted: PersistedRoom = {
      roomId: this.roomId,
      status: this.status,
      players: this.players,
      readyPlayerIds: [...this.readyPlayers],
      deployments: [...this.deployments.entries()],
      gameState: gameState
        ? { ...gameState, config: { ...gameState.config, blockedTiles: [...(gameState.config.blockedTiles ?? [])] } }
        : null,
      deploymentDeadline: this.deploymentDeadline,
      matchStartTime: this.matchStartTime,
      matchEndTime: this.matchEndTime,
      disconnectedPlayerId: this.disconnectedPlayerId,
      disconnectDeadline: this.disconnectDeadline,
      matchType: this.matchType,
      matchId: this.matchId,
      rankingProcessed: this.rankingProcessed,
      skins: [...this.skinsByPlayer.entries()],
    };
    await this.ctx.storage.put(ROOM_STORAGE_KEY, persisted);
  }

  /**
   * Sprint REC-01 — a Durable Object só permite UM alarme agendado por
   * vez (`ctx.storage.setAlarm` substitui o anterior). O prazo de
   * Posicionamento (TIMER-01) e a janela de reconexão (REC-01) usam o
   * mesmo mecanismo, então quem agenda por último "vence" e apaga o
   * outro se cada um chamasse `setAlarm` direto. Esta função sempre
   * agenda o PRÓXIMO prazo pendente entre os dois (o mais próximo no
   * tempo) — nunca perde um dos dois.
   */
  private async scheduleNextAlarm(): Promise<void> {
    const candidates = [this.deploymentDeadline, this.disconnectDeadline].filter(
      (t): t is number => t !== null,
    );
    if (candidates.length === 0) return;
    await this.ctx.storage.setAlarm(Math.min(...candidates));
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();
    const url = new URL(request.url);

    // Endpoint interno — só a AccountsRoom chama isso (DO-to-DO), nunca o cliente.
    if (url.pathname.endsWith("/internal/add-player") && request.method === "POST") {
      const body = (await request.json()) as {
        roomId: string;
        playerId: string;
        playerName: string;
        accountId: string;
        matchType?: MatchType;
      };
      if (!this.roomId) this.roomId = body.roomId;
      // Sprint RANKING-01 — só o primeiro jogador (quem cria a sala)
      // decide `matchType`; hoje sempre "casual" (nenhum fluxo manda
      // "ranked" ainda — ver Direcionamento Oficial #5/#6).
      if (this.players.length === 0 && body.matchType) this.matchType = body.matchType;
      const result = this.addPlayer(body.playerId, body.playerName, body.accountId);
      // Avisa quem já estiver conectado a esta sala (ex.: quem a criou)
      // que um novo jogador entrou — equivalente ao antigo
      // `broadcastRoomState` chamado depois de CreateRoom/JoinRoom.
      if (result.ok) {
        await this.persist();
        this.broadcastRoomState();
      }
      return Response.json(result);
    }

    // O Worker (`index.ts`) repassa a requisição original sem reescrever o
    // path (`/room/:id/ws`) — aqui dentro basta confirmar que é um upgrade
    // de WebSocket, a instância já é a sala certa (roteada por `idFromName`).
    if (url.pathname.endsWith("/ws")) {
      const playerId = url.searchParams.get("playerId") ?? "";
      if (!this.ownerOf(playerId)) {
        return new Response("Jogador não pertence a esta sala.", { status: 403 });
      }
      return acceptWebSocket(request, {
        onConnect: (conn) => this.handleConnect(conn, playerId),
        onMessage: (conn, data) => this.handleMessage(conn, playerId, data),
        onClose: (conn) => this.handleClose(conn, playerId),
      });
    }

    return new Response("Conflito GameRoom", { status: 200 });
  }

  // ── Ciclo da sala (idêntico a Room.ts) ──────────────────────────

  private addPlayer(playerId: PlayerId, playerName: string, accountId: string) {
    if (this.isFull()) {
      return { ok: false as const, reason: "Sala já está cheia." };
    }
    const owner: PlayerOwner = this.players.length === 0 ? "blue" : "red";
    const player: RoomPlayer = { playerId, playerName, owner, accountId };
    this.players.push(player);
    if (this.isFull()) this.status = "ready";
    return { ok: true as const, player, players: this.players, status: this.status };
  }

  private isFull(): boolean {
    return this.players.length >= 2;
  }

  private ownerOf(playerId: PlayerId): PlayerOwner | null {
    return this.players.find((p) => p.playerId === playerId)?.owner ?? null;
  }

  private removePlayer(playerId: PlayerId): void {
    this.players = this.players.filter((p) => p.playerId !== playerId);
    this.readyPlayers.delete(playerId);
    this.deployments.delete(playerId);
    if (this.status !== "waiting") this.status = "finished";
  }

  private markReady(playerId: PlayerId): { ok: boolean; reason?: string } {
    if (this.status !== "ready") {
      return { ok: false, reason: "A sala não está aguardando confirmação de prontidão." };
    }
    if (!this.ownerOf(playerId)) {
      return { ok: false, reason: "Jogador não pertence a esta sala." };
    }
    this.readyPlayers.add(playerId);
    if (this.readyPlayers.size >= 2) {
      this.status = "deployment";
      // Sprint TIMER-01 — prazo único do cronômetro de Posicionamento,
      // definido uma vez aqui e nunca recalculado — os dois jogadores
      // recebem exatamente este valor via `RoomStateChanged`.
      this.deploymentDeadline = Date.now() + DEPLOYMENT_DURATION_MS;
    }
    return { ok: true };
  }

  private confirmDeployment(playerId: PlayerId, pieces: Piece[]): { ok: boolean; reason?: string } {
    if (this.status !== "deployment") {
      return { ok: false, reason: "A sala não está na fase de posicionamento." };
    }
    const owner = this.ownerOf(playerId);
    if (!owner) return { ok: false, reason: "Jogador não pertence a esta sala." };

    const isValid = DeploymentManager.validateDeployment(pieces, ACTIVE_MAP.rows, ACTIVE_MAP.cols, BLOCKED_TILES, owner);
    if (!isValid) return { ok: false, reason: "Posicionamento inválido." };

    this.deployments.set(playerId, pieces);
    if (this.deployments.size >= 2) {
      const allPieces = [...this.deployments.values()].flat();
      this.session = new GameSession(allPieces);
      this.status = "playing";
      // Sprint TIMER-01 — instante único do início da Partida; o
      // cronômetro de Posicionamento não é mais relevante a partir daqui.
      this.matchStartTime = Date.now();
      this.deploymentDeadline = null;
      // Sprint RANKING-01 — identifica esta partida de forma única e
      // estável pro `AccountsRoom` (idempotência do processamento de
      // Rating). Gerado uma única vez aqui, nunca recalculado.
      this.matchId = crypto.randomUUID();
    }
    return { ok: true };
  }

  private applyAction(playerId: PlayerId, action: GameAction) {
    if (!this.session) return { ok: false as const, reason: "A partida ainda não começou." };
    const owner = this.ownerOf(playerId);
    if (!owner) return { ok: false as const, reason: "Jogador não pertence a esta sala." };
    const result = this.session.applyAction(owner, action);
    if (result.state.gameOver) {
      this.status = "finished";
      // Sprint TIMER-01 — só grava na primeira vez que `gameOver` vira
      // verdadeiro (`matchEndTime` já setado significa que já paramos).
      if (this.matchEndTime === null) this.matchEndTime = Date.now();
    }
    return result;
  }

  /**
   * Sprint RANKING-01 — Fase 7 (processamento do resultado). Só chama
   * `AccountsRoom` se `matchType === "ranked"` (nenhuma sala por
   * código hoje é "ranked" — Direcionamento Oficial #6) e ainda não
   * processado (`rankingProcessed`, defesa local além da idempotência
   * por `matchId` que o `AccountsRoom` já garante). Retorna o
   * resultado de Rating relativo a CADA jogador (`playerId → view`),
   * `null` pra ambos numa partida casual ou se o processamento falhar
   * por qualquer motivo — a Partida nunca deixa de terminar por causa
   * disso (Fase 7 — "nunca" o cliente decide Rating, mas o servidor
   * também nunca trava o fim de jogo por uma falha de rede interna).
   */
  private async finalizeMatch(
    winnerPlayer: Player,
    finalState: GameState,
  ): Promise<{ rankingByPlayer: Map<PlayerId, RankingResultView | null>; record: MatchRecord | null }> {
    const noRanking = new Map<PlayerId, RankingResultView | null>(this.players.map((p) => [p.playerId, null]));
    if (this.matchType !== "ranked" || this.rankingProcessed || !this.matchId) {
      return { rankingByPlayer: noRanking, record: null };
    }

    const bluePlayer = this.players.find((p) => p.owner === "blue");
    const redPlayer = this.players.find((p) => p.owner === "red");
    if (!bluePlayer || !redPlayer) return { rankingByPlayer: noRanking, record: null };

    try {
      const stub = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName("global"));
      const response = await stub.fetch("https://internal/internal/process-ranked-result", {
        method: "POST",
        body: JSON.stringify({
          matchId: this.matchId,
          blueAccountId: bluePlayer.accountId,
          redAccountId: redPlayer.accountId,
          winnerOwner: winnerPlayer === "BLUE" ? "blue" : "red",
          startedAt: this.matchStartTime,
          endedAt: this.matchEndTime,
          turnCount: finalState.turnNumber,
        }),
      });
      const result = (await response.json()) as { ok: boolean; record?: MatchRecord; reason?: string };
      if (!result.ok || !result.record) return { rankingByPlayer: noRanking, record: null };

      this.rankingProcessed = true;
      const record = result.record;

      const results = new Map<PlayerId, RankingResultView | null>();
      for (const player of this.players) {
        if (player.accountId === record.winnerId) {
          results.set(player.playerId, {
            matchType: "ranked",
            ratingBefore: record.winnerRatingBefore,
            ratingAfter: record.winnerRatingAfter,
            ratingDelta: record.winnerRatingDelta,
          });
        } else if (player.accountId === record.loserId) {
          results.set(player.playerId, {
            matchType: "ranked",
            ratingBefore: record.loserRatingBefore,
            ratingAfter: record.loserRatingAfter,
            ratingDelta: record.loserRatingDelta,
          });
        } else {
          results.set(player.playerId, null);
        }
      }
      return { rankingByPlayer: results, record };
    } catch {
      return { rankingByPlayer: noRanking, record: null };
    }
  }

  /**
   * Sprint RANKING-02 — Fase 1/3. Chamado pra TODA partida terminada
   * (casual OU ranked, ao contrário de `finalizeMatch` que só age em
   * ranked) — registra uma linha no histórico de `AccountsRoom`. Nunca
   * bloqueia o fim da Partida se falhar (mesma postura defensiva de
   * `finalizeMatch`).
   */
  private async recordMatchHistory(
    winnerPlayer: Player,
    finalState: GameState,
    reason: "victory" | "forfeit",
    rankedRecord: MatchRecord | null,
  ): Promise<void> {
    const bluePlayer = this.players.find((p) => p.owner === "blue");
    const redPlayer = this.players.find((p) => p.owner === "red");
    if (!bluePlayer || !redPlayer || !this.matchId) return;

    try {
      const stub = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName("global"));
      await stub.fetch("https://internal/internal/record-match-history", {
        method: "POST",
        body: JSON.stringify({
          matchId: this.matchId,
          matchType: this.matchType,
          blueAccountId: bluePlayer.accountId,
          blueNickname: bluePlayer.playerName,
          redAccountId: redPlayer.accountId,
          redNickname: redPlayer.playerName,
          winnerOwner: winnerPlayer === "BLUE" ? "blue" : "red",
          finishReason: reason,
          startedAt: this.matchStartTime,
          endedAt: this.matchEndTime,
          turnCount: finalState.turnNumber,
          rating: rankedRecord
            ? {
                winnerRatingBefore: rankedRecord.winnerRatingBefore,
                winnerRatingAfter: rankedRecord.winnerRatingAfter,
                loserRatingBefore: rankedRecord.loserRatingBefore,
                loserRatingAfter: rankedRecord.loserRatingAfter,
              }
            : null,
        }),
      });
    } catch {
      // Sprint RANKING-02 — mesma postura de `finalizeMatch`: o
      // histórico é um registro auxiliar, nunca trava o fim da Partida.
    }
  }

  /**
   * Sprint RANKING-01 — substitui os antigos `this.broadcast({type:
   * "GameFinished", ...})`: cada jogador recebe seu PRÓPRIO resultado
   * de Rating (`ranking`), nunca o do adversário — por isso um envio
   * por conexão em vez de um broadcast único com payload idêntico.
   */
  private async sendGameFinished(
    winnerPlayer: Player,
    finalState: GameState,
    reason: "victory" | "forfeit" = "victory",
  ): Promise<void> {
    const { rankingByPlayer, record } = await this.finalizeMatch(winnerPlayer, finalState);
    // Sprint RANKING-02 — histórico é registrado pra TODA partida
    // (casual ou ranked), independente do resultado de `finalizeMatch`.
    await this.recordMatchHistory(winnerPlayer, finalState, reason, record);
    await this.persist();
    for (const player of this.players) {
      const conn = this.connectionsByPlayer.get(player.playerId);
      if (!conn) continue;
      this.send(conn, {
        type: "GameFinished",
        winner: winnerPlayer,
        state: finalState,
        matchStartTime: this.matchStartTime!,
        matchEndTime: this.matchEndTime!,
        reason,
        matchType: this.matchType,
        ranking: rankingByPlayer.get(player.playerId) ?? null,
      });
    }
  }

  // ── Transporte / eventos de rede ────────────────────────────────

  /**
   * `GameState.config.blockedTiles` é um `Set` — `JSON.stringify` de um
   * `Set` produz `"{}"` (perde o conteúdo). Serializa como array antes
   * de enviar; `NetworkClient.rehydrateGameState` reconstrói o `Set` do
   * lado do cliente. Puro transporte, nenhuma regra de jogo envolvida.
   */
  private send(conn: TransportConnection, event: ServerEvent): void {
    const wireEvent =
      "state" in event && event.state
        ? {
            ...event,
            state: {
              ...event.state,
              config: {
                ...event.state.config,
                blockedTiles: [...(event.state.config.blockedTiles ?? [])],
              },
            },
          }
        : event;
    conn.send(JSON.stringify(wireEvent));
  }

  private broadcast(event: ServerEvent): void {
    for (const player of this.players) {
      const conn = this.connectionsByPlayer.get(player.playerId);
      if (conn) this.send(conn, event);
    }
  }

  /** Visual de cada lado (azul/vermelho), para o cliente desenhar as peças do adversário. */
  private skinsByOwner(): Partial<Record<"blue" | "red", SkinTable>> {
    const out: Partial<Record<"blue" | "red", SkinTable>> = {};
    for (const player of this.players) {
      const t = this.skinsByPlayer.get(player.playerId);
      if (t) out[player.owner] = t;
    }
    return out;
  }

  private broadcastRoomState(): void {
    this.broadcast({
      type: "RoomStateChanged",
      roomId: this.roomId,
      status: this.status,
      players: this.players,
      readyPlayerIds: [...this.readyPlayers],
      deployedPlayerIds: [...this.deployments.keys()],
      deploymentDeadline: this.deploymentDeadline,
      matchType: this.matchType,
    });
  }

  private async handleConnect(conn: TransportConnection, playerId: PlayerId): Promise<void> {
    this.connectionsByPlayer.set(playerId, conn);

    // Sprint REC-01 — este jogador estava na janela de tolerância de
    // 3 minutos (`handleClose`) e voltou a tempo: cancela o W.O.
    // pendente e avisa o adversário que ele reconectou. Cobre tanto um
    // F5 (`NetworkClient.connect` resume direto na sala) quanto uma
    // queda de socket comum já reconectada por `handleSocketDown`.
    if (this.disconnectedPlayerId === playerId) {
      this.disconnectedPlayerId = null;
      this.disconnectDeadline = null;
      await this.persist();
      await this.scheduleNextAlarm();
      this.broadcast({ type: "PlayerReconnected", playerId });
    }

    // Envia o estado atual da sala assim que a conexão abre — evita uma
    // corrida onde o outro jogador entra/fica pronto bem no instante em
    // que este socket ainda está subindo e perderia esse broadcast.
    this.send(conn, {
      type: "RoomStateChanged",
      roomId: this.roomId,
      status: this.status,
      players: this.players,
      readyPlayerIds: [...this.readyPlayers],
      deployedPlayerIds: [...this.deployments.keys()],
      deploymentDeadline: this.deploymentDeadline,
      matchType: this.matchType,
    });
    // Oficina do Exército — manda o visual já conhecido de cada lado (reconexão/F5 inclusos).
    this.send(conn, { type: "SkinsUpdated", skins: this.skinsByOwner() });
    // Sprint QA-09 — uma reconexão (depois do socket cair por ociosidade,
    // ver `NetworkClient.handleSocketDown`) chega aqui como uma conexão
    // nova; sem isto, um jogador que já estava em partida ficaria preso
    // no `GameState` antigo (o `RoomStateChanged` acima não carrega o
    // tabuleiro) até a próxima jogada do adversário.
    if (this.status === "playing" && this.session) {
      this.send(conn, {
        type: "GameStarted",
        state: this.session.getState(),
        matchStartTime: this.matchStartTime!,
        matchType: this.matchType,
      });
    }
  }

  private async handleClose(_conn: TransportConnection, playerId: PlayerId): Promise<void> {
    this.connectionsByPlayer.delete(playerId);
    if (!this.ownerOf(playerId)) return;

    // Sprint REC-01 — antes de "waiting"/"ready" (a Partida ainda nem
    // começou de verdade), uma desconexão libera a vaga na hora, como
    // sempre foi — não há nada em andamento pra vale a pena segurar.
    if (this.status === "waiting" || this.status === "ready") {
      this.removePlayer(playerId);
      await this.persist();
      this.broadcast({ type: "PlayerDisconnected", playerId, reconnectDeadline: null });
      this.broadcastRoomState();
      return;
    }

    // Sprint REC-01 — "deployment"/"playing": NUNCA remove o jogador
    // nem encerra a sala na hora. Só marca a desconexão e dá 3 minutos
    // pra reconectar (`handleConnect` limpa isso se ele voltar a
    // tempo); só o alarme decide o W.O., depois do prazo vencido.
    this.disconnectedPlayerId = playerId;
    this.disconnectDeadline = Date.now() + RECONNECT_GRACE_MS;
    await this.persist();
    await this.scheduleNextAlarm();
    this.broadcast({ type: "PlayerDisconnected", playerId, reconnectDeadline: this.disconnectDeadline });
  }

  private async handleMessage(conn: TransportConnection, playerId: PlayerId, raw: string): Promise<void> {
    let event: ClientEvent;
    try {
      event = JSON.parse(raw) as ClientEvent;
    } catch {
      this.send(conn, { type: "ActionRejected", reason: "Mensagem inválida." });
      return;
    }

    switch (event.type) {
      case "LeaveRoom": {
        this.removePlayer(playerId);
        this.connectionsByPlayer.delete(playerId);
        await this.persist();
        this.broadcastRoomState();
        break;
      }

      case "SetSkins": {
        // Só jogadores desta sala; o servidor nunca confia no cliente: valida pelo catálogo.
        if (!this.ownerOf(playerId)) {
          this.send(conn, { type: "ActionRejected", reason: "Você não está nesta sala." });
          break;
        }
        // O visual só muda ANTES da partida (Oficina do menu); durante ela fica travado.
        if (this.status === "playing" || this.status === "finished") {
          this.send(conn, { type: "ActionRejected", reason: "O visual não pode ser alterado durante a partida." });
          break;
        }
        this.skinsByPlayer.set(playerId, sanitizeSkins(event.skins));
        await this.persist();
        this.broadcast({ type: "SkinsUpdated", skins: this.skinsByOwner() });
        break;
      }

      case "PlayerReady": {
        const result = this.markReady(playerId);
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Não foi possível confirmar." });
          break;
        }
        await this.persist();
        this.broadcastRoomState();
        // Sprint TIMER-01 — rede de segurança server-authoritative: se
        // algum jogador nunca confirmar o posicionamento (aba fechada,
        // cliente travado), o alarme garante que a Partida começa mesmo
        // assim, exatamente no prazo que os dois clientes já mostram.
        if (this.status === "deployment" && this.deploymentDeadline !== null) {
          await this.scheduleNextAlarm();
        }
        break;
      }

      case "ConfirmDeployment": {
        const result = this.confirmDeployment(playerId, event.pieces);
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Posicionamento inválido." });
          break;
        }
        await this.persist();
        this.broadcastRoomState();
        if (this.status === "playing" && this.session) {
          this.broadcast({
            type: "GameStarted",
            state: this.session.getState(),
            matchStartTime: this.matchStartTime!,
            matchType: this.matchType,
          });
        }
        break;
      }

      case "MovePiece": {
        // Sprint QA-R02-01 — o servidor precisa saber QUAL peça mover
        // antes de aplicar `MOVE_SELECTED` (o Motor sempre operou sobre
        // `state.selectedPieceId`); a Sprint SEC-01 tirou "SelectPiece"
        // do protocolo pra não vazar a seleção pro adversário, mas isso
        // deixou o servidor sem nenhuma forma de setar esse campo — todo
        // movimento virava `ActionRejected`. Corrigido validando a
        // seleção aqui, no servidor, com a MESMA função pura de sempre
        // (`GameEngine.selectPiece`, via `applyAction`/`SELECT_PIECE`) —
        // nunca broadcastada por si só, só usada internamente antes do
        // `MOVE_SELECTED` no mesmo turno de mensagem.
        const selectResult = this.applyAction(playerId, { type: "SELECT_PIECE", pieceId: event.pieceId });
        if (!selectResult.ok) {
          this.send(conn, { type: "ActionRejected", reason: selectResult.reason ?? "Peça inválida." });
          break;
        }

        const result = this.applyAction(playerId, { type: "MOVE_SELECTED", row: event.row, column: event.column });
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Ação inválida." });
          break;
        }
        await this.persist();
        if (result.state.gameOver && result.state.winner) {
          await this.sendGameFinished(result.state.winner, result.state);
        } else {
          this.broadcast({ type: "ActionApplied", state: result.state, appliedBy: playerId });
        }
        break;
      }

      case "EndTurn": {
        const result = this.applyAction(playerId, { type: "END_TURN" });
        if (!result.ok) {
          this.send(conn, { type: "ActionRejected", reason: result.reason ?? "Ação inválida." });
          break;
        }
        await this.persist();
        if (result.state.gameOver && result.state.winner) {
          await this.sendGameFinished(result.state.winner, result.state);
        } else {
          this.broadcast({ type: "ActionApplied", state: result.state, appliedBy: playerId });
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Sprint REC-01 — a janela de tolerância (`RECONNECT_GRACE_MS`)
   * venceu sem o jogador voltar: dá a vitória automática pro
   * adversário. Nunca cancela a sala, nunca a deixa travada — sempre
   * termina com um `GameFinished` de verdade, igual uma vitória por
   * combate.
   */
  private async forfeit(disconnectedPlayerId: PlayerId): Promise<void> {
    const loserOwner = this.ownerOf(disconnectedPlayerId);
    this.disconnectedPlayerId = null;
    this.disconnectDeadline = null;
    if (!loserOwner) {
      await this.persist();
      return;
    }
    const winnerPlayer: Player = ownerToPlayer(loserOwner) === "BLUE" ? "RED" : "BLUE";

    if (!this.session) {
      // Sprint REC-01 — desconectou durante o próprio Posicionamento,
      // antes do prazo do TIMER-01 vencer: ainda não existe uma
      // `GameSession`. Reaproveita o MESMO gerador padrão (offline/IA)
      // pra montar um tabuleiro válido pros dois lados — só assim
      // existe um `GameState` pra mostrar na tela de resultado.
      for (const player of this.players) {
        if (this.deployments.has(player.playerId)) continue;
        const autoPieces = DeploymentManager.createDefaultPlayerDeployment(
          ACTIVE_MAP.rows,
          ACTIVE_MAP.cols,
          player.owner,
        );
        this.deployments.set(player.playerId, autoPieces);
      }
      this.session = new GameSession([...this.deployments.values()].flat());
      this.matchStartTime = this.matchStartTime ?? Date.now();
    }

    this.status = "finished";
    if (this.matchEndTime === null) this.matchEndTime = Date.now();
    const finalState: GameState = { ...this.session.getState(), gameOver: true, winner: winnerPlayer };
    this.session = GameSession.fromState(finalState);

    await this.persist();
    await this.sendGameFinished(winnerPlayer, finalState, "forfeit");
  }

  /**
   * Sprint TIMER-01 — dispara no prazo exato de `deploymentDeadline`
   * (`ctx.storage.setAlarm`, agendado em `PlayerReady`). Autoridade
   * final do servidor: se a sala ainda estiver em `"deployment"` nesse
   * instante, confirma automaticamente o posicionamento de quem ainda
   * não confirmou — reaproveitando o MESMO gerador usado offline pra
   * IA (`DeploymentManager.createDefaultPlayerDeployment`), nenhuma
   * lógica nova. Nunca cancela a sala, nunca volta pro Lobby, nunca
   * expõe erro — só garante que a Partida começa.
   *
   * Sprint REC-01 — o mesmo alarme agora também cobre o W.O. por
   * desconexão (`scheduleNextAlarm` sempre agenda o prazo mais
   * próximo entre os dois). Os dois prazos são checados de forma
   * independente: um disparo não cancela o outro se ainda não venceu.
   */
  async alarm(): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();

    if (this.status === "deployment" && this.deploymentDeadline !== null && now >= this.deploymentDeadline) {
      for (const player of this.players) {
        if (this.deployments.has(player.playerId)) continue;
        const autoPieces = DeploymentManager.createDefaultPlayerDeployment(
          ACTIVE_MAP.rows,
          ACTIVE_MAP.cols,
          player.owner,
        );
        this.confirmDeployment(player.playerId, autoPieces);
      }
      this.deploymentDeadline = null;
      await this.persist();
      this.broadcastRoomState();
      if (this.session) {
        this.broadcast({
          type: "GameStarted",
          state: this.session.getState(),
          matchStartTime: this.matchStartTime!,
          matchType: this.matchType,
        });
      }
    }

    if (
      this.disconnectedPlayerId !== null &&
      this.disconnectDeadline !== null &&
      now >= this.disconnectDeadline &&
      (this.status === "deployment" || this.status === "playing")
    ) {
      await this.forfeit(this.disconnectedPlayerId);
    }

    await this.scheduleNextAlarm();
  }
}
