// Camada 3 — Durable Object "AccountsRoom": instância ÚNICA e fixa
// (Sprint MP-04) que trata Login/Cadastro/Criar Sala/Entrar Sala —
// tudo que acontece ANTES de existir uma sala. Uma vez que o jogador
// entra numa sala, o cliente reconecta direto na `GameRoom` daquela
// sala (uma Durable Object por sala); esta instância só guarda contas,
// sessões e quais `roomId` existem.
//
// Porta direta de `server/src/AccountManager.ts` + `SessionManager.ts`
// + a parte de Register/Login/CreateRoom/JoinRoom de `index.ts`, sem
// nenhuma regra nova. Hash de senha via `CryptoService` — nunca API de
// criptografia direta (Sprint MP-04, item 2).
//
// Sprint QA-03 — causa raiz de dois bugs relacionados:
//   1) `accountsById`/`accountsByNickname`/`sessions`/`activeRoomIds`
//      viviam só em memória — uma Durable Object ociosa pode ser
//      evictada pela Cloudflare, perdendo esses dados. Persistidos
//      agora via `ctx.storage` (mesma DO, sem infraestrutura nova).
//   2) `sessions` era escrito no Login/Cadastro mas NUNCA lido — não
//      existia nenhuma forma de reaproveitar um token já emitido numa
//      conexão nova. Cada WebSocket novo nascia com `accountId: null`
//      até logar de novo. Adicionado `ResumeSession`, que valida o
//      token persistido e reatribui a conta à conexão atual.
//
// Sprint QA-05 — causa raiz de "Sala não encontrada" (localizada e
// comprovada por log na Sprint QA-04): a Interface mostra o código da
// sala em MAIÚSCULAS (`waiting-room.tsx`, só visual), mas `roomId` é
// sempre gerado em minúsculas; a busca em `ctx.storage` era
// case-sensitive e nunca normalizava o valor recebido do cliente.
// Corrigido: todo `roomId` vindo do cliente é normalizado
// (`trim().toLowerCase()`) uma única vez, e só o valor normalizado é
// usado daí em diante (storage, Durable Object, resposta ao cliente).

import { DurableObject } from "cloudflare:workers";
import { acceptWebSocket, type TransportConnection } from "./durableTransport";
import { CryptoService } from "@/services/cryptoService";
import { calculateEloUpdate, calculateWinRate, getRankTier } from "@/services/eloRating";
import {
  defaultPlayerStats,
  type LeaderboardEntry,
  type MatchHistoryEntry,
  type MatchRecord,
  type MatchType,
  type MyStatsData,
  type PlayerStats,
} from "@/types/ranking";
import type { ClientEvent, PlayerId, RoomPlayerInfo, ServerEvent } from "@/multiplayer/protocol";
import type { Env } from "./env";

interface Account {
  id: string;
  nickname: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  /**
   * Sprint RANKING-01 — opcional na FORMA persistida porque contas
   * criadas antes desta sprint não têm este campo gravado. Nunca lido
   * direto do storage fora de `loadAccount` — só ali a migração
   * (Fase 2, "conta antiga sem stats recebe stats padrão") acontece,
   * um único lugar, sem duplicar a lógica de "conta antiga" em cada
   * ponto que hoje já lê uma `Account` (`login`, `resumeSession`).
   */
  stats?: PlayerStats;
}

interface Session {
  token: string;
  accountId: string;
  createdAt: number;
}

interface ConnectedPlayer {
  playerId: PlayerId;
  playerName: string;
  accountId: string | null;
  nickname: string | null;
}

/** Sprint RANKING-01 — corpo do POST interno `GameRoom` → `AccountsRoom` em `/internal/process-ranked-result`. */
interface ProcessRankedResultInput {
  matchId: string;
  blueAccountId: string;
  redAccountId: string;
  winnerOwner: "blue" | "red";
  startedAt: number;
  endedAt: number;
  turnCount: number;
}

/**
 * Sprint RANKING-02 — corpo do POST interno `GameRoom` → `AccountsRoom`
 * em `/internal/record-match-history`. Diferente de
 * `ProcessRankedResultInput`: este é chamado pra TODA partida (casual
 * OU ranked) — `GameRoom` decide o `matchType`, nunca esta função.
 * `rating` só vem preenchido quando `matchType === "ranked"` (mesmos
 * valores que `processRankedResult` já calculou, reaproveitados —
 * nunca recalculados aqui).
 */
interface RecordMatchHistoryInput {
  matchId: string;
  matchType: MatchType;
  blueAccountId: string;
  blueNickname: string;
  redAccountId: string;
  redNickname: string;
  winnerOwner: "blue" | "red";
  finishReason: "victory" | "forfeit";
  startedAt: number;
  endedAt: number;
  turnCount: number;
  rating: {
    winnerRatingBefore: number;
    winnerRatingAfter: number;
    loserRatingBefore: number;
    loserRatingAfter: number;
  } | null;
}

/** Índice de assinatura exigido por `SqlStorage.exec<T>` (`T extends Record<string, SqlStorageValue>`). */
interface MatchHistoryRow {
  [key: string]: string | number | null;
  matchId: string;
  matchType: string;
  blueAccountId: string;
  blueNickname: string;
  redAccountId: string;
  redNickname: string;
  winnerOwner: string;
  finishReason: string;
  startedAt: number;
  endedAt: number;
  turnCount: number;
  winnerRatingBefore: number | null;
  winnerRatingAfter: number | null;
  loserRatingBefore: number | null;
  loserRatingAfter: number | null;
}

export class AccountsRoom extends DurableObject<Env> {
  private playersByConnection = new Map<string, ConnectedPlayer>();
  private schemaReady = false;

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);

    // Sprint RANKING-01 — endpoint interno, só a GameRoom chama isso
    // (DO-to-DO), nunca o cliente. Mesmo padrão de
    // `GameRoom`/`/internal/add-player`.
    if (url.pathname.endsWith("/internal/process-ranked-result") && request.method === "POST") {
      const body = (await request.json()) as ProcessRankedResultInput;
      const result = await this.processRankedResult(body);
      return Response.json(result);
    }

    // Sprint RANKING-02 — mesmo padrão DO-to-DO, chamado pra TODA
    // partida (casual ou ranked), sempre depois (ou junto) de
    // `/internal/process-ranked-result` quando aplicável.
    if (url.pathname.endsWith("/internal/record-match-history") && request.method === "POST") {
      const body = (await request.json()) as RecordMatchHistoryInput;
      this.recordMatchHistory(body);
      return Response.json({ ok: true });
    }

    return acceptWebSocket(request, {
      onConnect: (conn) => this.handleConnect(conn),
      onMessage: (conn, data) => this.handleMessage(conn, data),
      onClose: (conn) => this.handleClose(conn),
    });
  }

  /**
   * Sprint RANKING-01 — Fase 10 (Ranking global). Mantém um espelho
   * SQL enxuto (`leaderboard`) da conta pública de cada jogador, só
   * pra ordenar/paginar de forma barata — o dado oficial continua
   * sendo a `Account` em `ctx.storage` (chave-valor, já usada por todo
   * o resto do sistema); esta tabela é só um ÍNDICE, nunca a fonte da
   * verdade. `new_sqlite_classes` já inclui `AccountsRoom`
   * (`wrangler.toml`, Sprint MP-04) — nenhuma infraestrutura nova, só
   * passa a usar uma capacidade que a Durable Object já tinha.
   */
  private ensureSchema(): void {
    if (this.schemaReady) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        accountId TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        rating INTEGER NOT NULL,
        wins INTEGER NOT NULL,
        losses INTEGER NOT NULL,
        rankedMatches INTEGER NOT NULL
      )
    `);
    // Sprint RANKING-02 — UM registro canônico por partida (não dois,
    // um por jogador) — a view "espelhada" de cada lado (quem foi o
    // adversário, vitória ou derrota) é derivada na leitura
    // (`toMatchHistoryEntry`), nunca duplicada no storage. `matchId`
    // é a chave primária: a MESMA proteção de idempotência que
    // `processRankedResult` já usa (`match:{matchId}` em `ctx.storage`
    // KV) também vale aqui — inserir de novo é inofensivo (`INSERT OR
    // IGNORE`).
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS match_history (
        matchId TEXT PRIMARY KEY,
        matchType TEXT NOT NULL,
        blueAccountId TEXT NOT NULL,
        blueNickname TEXT NOT NULL,
        redAccountId TEXT NOT NULL,
        redNickname TEXT NOT NULL,
        winnerOwner TEXT NOT NULL,
        finishReason TEXT NOT NULL,
        startedAt INTEGER NOT NULL,
        endedAt INTEGER NOT NULL,
        turnCount INTEGER NOT NULL,
        winnerRatingBefore INTEGER,
        winnerRatingAfter INTEGER,
        loserRatingBefore INTEGER,
        loserRatingAfter INTEGER
      )
    `);
    this.ctx.storage.sql.exec(
      `CREATE INDEX IF NOT EXISTS idx_match_history_blue ON match_history (blueAccountId, endedAt DESC)`,
    );
    this.ctx.storage.sql.exec(
      `CREATE INDEX IF NOT EXISTS idx_match_history_red ON match_history (redAccountId, endedAt DESC)`,
    );
    this.schemaReady = true;
  }

  /**
   * Sprint RANKING-02 — Fase 1/3. Chamado pra TODA partida terminada
   * (casual ou ranked — `GameRoom.sendGameFinished` sempre chama isto,
   * independente de `finalizeMatch`/Elo). `INSERT OR IGNORE` +
   * `matchId` como chave primária: se `GameRoom` chamar isso mais de
   * uma vez pro mesmo `matchId` (ex.: reenvio de rede), a segunda
   * chamada não faz nada — mesma garantia de idempotência que
   * `processRankedResult` já tem pro Rating.
   */
  private recordMatchHistory(input: RecordMatchHistoryInput): void {
    this.ensureSchema();
    this.ctx.storage.sql.exec(
      `INSERT OR IGNORE INTO match_history (
         matchId, matchType, blueAccountId, blueNickname, redAccountId, redNickname,
         winnerOwner, finishReason, startedAt, endedAt, turnCount,
         winnerRatingBefore, winnerRatingAfter, loserRatingBefore, loserRatingAfter
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.matchId,
      input.matchType,
      input.blueAccountId,
      input.blueNickname,
      input.redAccountId,
      input.redNickname,
      input.winnerOwner,
      input.finishReason,
      input.startedAt,
      input.endedAt,
      input.turnCount,
      input.rating?.winnerRatingBefore ?? null,
      input.rating?.winnerRatingAfter ?? null,
      input.rating?.loserRatingBefore ?? null,
      input.rating?.loserRatingAfter ?? null,
    );
  }

  /** Fase 1 — converte UMA linha canônica na perspectiva de `accountId` (o mesmo registro, visto pelos dois lados, nunca diverge). */
  private toMatchHistoryEntry(row: MatchHistoryRow, accountId: string): MatchHistoryEntry {
    const isBlue = row.blueAccountId === accountId;
    const playerOwner: "blue" | "red" = isBlue ? "blue" : "red";
    const opponentOwner: "blue" | "red" = isBlue ? "red" : "blue";
    const won = row.winnerOwner === playerOwner;
    const ranked = row.matchType === "ranked";

    const entry: MatchHistoryEntry = {
      matchId: row.matchId,
      matchType: row.matchType as MatchType,
      result: won ? "victory" : "defeat",
      opponentId: isBlue ? row.redAccountId : row.blueAccountId,
      opponentNickname: isBlue ? row.redNickname : row.blueNickname,
      playerOwner,
      opponentOwner,
      durationMs: Math.max(0, row.endedAt - row.startedAt),
      turnNumber: row.turnCount,
      finishedAt: row.endedAt,
      finishReason: row.finishReason as "victory" | "forfeit",
    };

    if (ranked && row.winnerRatingBefore !== null && row.winnerRatingAfter !== null && row.loserRatingBefore !== null && row.loserRatingAfter !== null) {
      const before = won ? row.winnerRatingBefore : row.loserRatingBefore;
      const after = won ? row.winnerRatingAfter : row.loserRatingAfter;
      entry.ratingBefore = before;
      entry.ratingAfter = after;
      entry.ratingChange = after - before;
    }

    return entry;
  }

  /** Fase 3 — `finishedAt DESC`, `limit`, filtrado ao `accountId` (Fase 10 — "vinculado ao accountId autenticado"). */
  private getMatchHistory(accountId: string, limit: number): MatchHistoryEntry[] {
    this.ensureSchema();
    const cursor = this.ctx.storage.sql.exec<MatchHistoryRow>(
      `SELECT * FROM match_history
       WHERE blueAccountId = ? OR redAccountId = ?
       ORDER BY endedAt DESC
       LIMIT ?`,
      accountId,
      accountId,
      limit,
    );
    return cursor.toArray().map((row) => this.toMatchHistoryEntry(row, accountId));
  }

  /**
   * Fase 13 — "o jogador só entra no Ranking global público após
   * completar sua primeira partida ranqueada". Em vez de espalhar essa
   * checagem em todo lugar que toca o Ranking, ela vive só aqui: uma
   * conta com `rankedMatches === 0` nunca tem linha na tabela (e se
   * tinha — não deveria, mas por segurança — é removida).
   */
  private upsertLeaderboardRow(account: Account): void {
    this.ensureSchema();
    const stats = account.stats;
    if (!stats || stats.rankedMatches <= 0) {
      this.ctx.storage.sql.exec(`DELETE FROM leaderboard WHERE accountId = ?`, account.id);
      return;
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO leaderboard (accountId, username, rating, wins, losses, rankedMatches)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(accountId) DO UPDATE SET
         username = excluded.username,
         rating = excluded.rating,
         wins = excluded.wins,
         losses = excluded.losses,
         rankedMatches = excluded.rankedMatches`,
      account.id,
      account.nickname,
      stats.rating,
      stats.wins,
      stats.losses,
      stats.rankedMatches,
    );
  }

  /** Fase 10 — ordenação oficial: rating DESC, wins DESC, rankedMatches ASC, username ASC. */
  private getLeaderboardRows(limit: number): LeaderboardEntry[] {
    this.ensureSchema();
    const cursor = this.ctx.storage.sql.exec<{
      accountId: string;
      username: string;
      rating: number;
      wins: number;
      losses: number;
      rankedMatches: number;
    }>(
      `SELECT accountId, username, rating, wins, losses, rankedMatches FROM leaderboard
       ORDER BY rating DESC, wins DESC, rankedMatches ASC, username ASC
       LIMIT ?`,
      limit,
    );
    return cursor.toArray().map((r, i) => ({
      position: i + 1,
      accountId: r.accountId,
      username: r.username,
      rating: r.rating,
      rankTier: getRankTier(r.rating),
      rankedMatches: r.rankedMatches,
      wins: r.wins,
      losses: r.losses,
      winRate: calculateWinRate(r.wins, r.losses),
    }));
  }

  /**
   * Fase 12 — posição do jogador no Ranking global, mesmo que ele não
   * apareça no TOP N retornado por `getLeaderboardRows`. `null` quando
   * a conta ainda não tem linha na tabela (Fase 13 — nenhuma partida
   * ranqueada completada ainda).
   */
  private getPlayerPosition(accountId: string): number | null {
    this.ensureSchema();
    const rowCursor = this.ctx.storage.sql.exec<{
      rating: number;
      wins: number;
      rankedMatches: number;
      username: string;
    }>(`SELECT rating, wins, rankedMatches, username FROM leaderboard WHERE accountId = ?`, accountId);
    const row = rowCursor.toArray()[0];
    if (!row) return null;

    const countCursor = this.ctx.storage.sql.exec<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM leaderboard WHERE
         rating > ?
         OR (rating = ? AND wins > ?)
         OR (rating = ? AND wins = ? AND rankedMatches < ?)
         OR (rating = ? AND wins = ? AND rankedMatches = ? AND username < ?)`,
      row.rating,
      row.rating,
      row.wins,
      row.rating,
      row.wins,
      row.rankedMatches,
      row.rating,
      row.wins,
      row.rankedMatches,
      row.username,
    );
    const cnt = countCursor.toArray()[0]?.cnt ?? 0;
    return cnt + 1;
  }

  /**
   * Fase 12/13 (RANKING-01) — "Sua Posição". `position: null` quando o
   * jogador ainda não tem partida ranqueada. Sprint RANKING-02 — passa
   * a incluir também os campos de `PlayerStats` que só o Perfil do
   * Comandante precisa (peakRating, sequências, Azul/Vermelho, tempo
   * total, vitória mais rápida) — reaproveitando o MESMO evento em vez
   * de criar um `GetMyProfile` paralelo (Fase 4 — "não duplicar
   * eventos que já existem").
   */
  private toMyStatsData(account: Account): MyStatsData {
    const stats = account.stats ?? defaultPlayerStats();
    return {
      accountId: account.id,
      username: account.nickname,
      rating: stats.rating,
      rankTier: getRankTier(stats.rating),
      rankedMatches: stats.rankedMatches,
      wins: stats.wins,
      losses: stats.losses,
      winRate: calculateWinRate(stats.wins, stats.losses),
      position: this.getPlayerPosition(account.id),
      peakRating: stats.peakRating,
      winStreak: stats.winStreak,
      bestWinStreak: stats.bestWinStreak,
      blueWins: stats.blueWins,
      blueLosses: stats.blueLosses,
      redWins: stats.redWins,
      redLosses: stats.redLosses,
      totalPlayTimeMs: stats.totalPlayTimeMs,
      fastestVictoryMs: stats.fastestVictoryMs,
    };
  }

  /**
   * Sprint RANKING-01 — Fase 7/5. Idempotente por `matchId`: se já
   * existe um `MatchRecord` salvo com esse id, devolve o MESMO
   * resultado de novo sem tocar em Rating/estatísticas outra vez
   * (Fase 5 — "UM RESULTADO POR MATCH ID"). `GameRoom` é quem decide
   * SE chama isso (só quando `matchType === "ranked"`); esta função
   * nunca sabe o que é "casual" — só processa o que recebe.
   */
  private async processRankedResult(
    input: ProcessRankedResultInput,
  ): Promise<{ ok: true; record: MatchRecord } | { ok: false; reason: string }> {
    const existing = await this.ctx.storage.get<MatchRecord>(`match:${input.matchId}`);
    if (existing) return { ok: true, record: existing };

    const blue = await this.loadAccount(input.blueAccountId);
    const red = await this.loadAccount(input.redAccountId);
    if (!blue || !red) return { ok: false, reason: "Conta não encontrada." };

    const winnerIsBlue = input.winnerOwner === "blue";
    const winnerAccount = winnerIsBlue ? blue : red;
    const loserAccount = winnerIsBlue ? red : blue;
    const winnerStatsBefore = winnerAccount.stats ?? defaultPlayerStats();
    const loserStatsBefore = loserAccount.stats ?? defaultPlayerStats();
    const durationMs = Math.max(0, input.endedAt - input.startedAt);

    // Fase 3 — Elo padrão, calculado exclusivamente aqui no servidor.
    const { newRatingA: winnerRatingAfter, newRatingB: loserRatingAfter } = calculateEloUpdate(
      winnerStatsBefore.rating,
      loserStatsBefore.rating,
      1,
    );

    // Fase 8 — atualização das estatísticas.
    const newWinnerStreak = winnerStatsBefore.winStreak + 1;
    const winnerStats: PlayerStats = {
      ...winnerStatsBefore,
      rating: winnerRatingAfter,
      peakRating: Math.max(winnerStatsBefore.peakRating, winnerRatingAfter),
      rankedMatches: winnerStatsBefore.rankedMatches + 1,
      wins: winnerStatsBefore.wins + 1,
      winStreak: newWinnerStreak,
      bestWinStreak: Math.max(winnerStatsBefore.bestWinStreak, newWinnerStreak),
      blueWins: winnerStatsBefore.blueWins + (winnerIsBlue ? 1 : 0),
      redWins: winnerStatsBefore.redWins + (winnerIsBlue ? 0 : 1),
      totalPlayTimeMs: winnerStatsBefore.totalPlayTimeMs + durationMs,
      fastestVictoryMs:
        winnerStatsBefore.fastestVictoryMs === null
          ? durationMs
          : Math.min(winnerStatsBefore.fastestVictoryMs, durationMs),
    };
    const loserStats: PlayerStats = {
      ...loserStatsBefore,
      rating: loserRatingAfter,
      rankedMatches: loserStatsBefore.rankedMatches + 1,
      losses: loserStatsBefore.losses + 1,
      winStreak: 0,
      blueLosses: loserStatsBefore.blueLosses + (winnerIsBlue ? 0 : 1),
      redLosses: loserStatsBefore.redLosses + (winnerIsBlue ? 1 : 0),
      totalPlayTimeMs: loserStatsBefore.totalPlayTimeMs + durationMs,
    };

    const winnerUpdated: Account = { ...winnerAccount, stats: winnerStats };
    const loserUpdated: Account = { ...loserAccount, stats: loserStats };
    await this.ctx.storage.put(`account:${winnerUpdated.id}`, winnerUpdated);
    await this.ctx.storage.put(`account:${loserUpdated.id}`, loserUpdated);
    this.upsertLeaderboardRow(winnerUpdated);
    this.upsertLeaderboardRow(loserUpdated);

    const record: MatchRecord = {
      matchId: input.matchId,
      bluePlayerId: input.blueAccountId,
      redPlayerId: input.redAccountId,
      winnerId: winnerAccount.id,
      loserId: loserAccount.id,
      winnerOwner: input.winnerOwner,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMs,
      turnCount: input.turnCount,
      winnerRatingBefore: winnerStatsBefore.rating,
      winnerRatingAfter,
      winnerRatingDelta: winnerRatingAfter - winnerStatsBefore.rating,
      loserRatingBefore: loserStatsBefore.rating,
      loserRatingAfter,
      loserRatingDelta: loserRatingAfter - loserStatsBefore.rating,
      ranked: true,
    };
    await this.ctx.storage.put(`match:${input.matchId}`, record);

    return { ok: true, record };
  }

  // ── Contas (idêntico a AccountManager.ts, agora persistido em
  //    `ctx.storage` — sobrevive a uma eviction da Durable Object) ──

  private async register(nickname: string, email: string, password: string) {
    const key = nickname.trim().toLowerCase();
    if (!key || password.length < 4) {
      return { ok: false as const, reason: "Nickname ou senha inválidos." };
    }
    const existingId = await this.ctx.storage.get<string>(`nickname:${key}`);
    if (existingId) {
      return { ok: false as const, reason: "Este nickname já está em uso." };
    }
    const account: Account = {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      email: email.trim(),
      passwordHash: await CryptoService.hash(password),
      createdAt: Date.now(),
      // Sprint RANKING-01 — Direcionamento Oficial #1: todo jogador
      // novo começa com exatamente 500 pontos.
      stats: defaultPlayerStats(),
    };
    await this.ctx.storage.put(`account:${account.id}`, account);
    await this.ctx.storage.put(`nickname:${key}`, account.id);
    return { ok: true as const, profile: this.toPublicProfile(account) };
  }

  private async login(nickname: string, password: string) {
    const id = await this.ctx.storage.get<string>(`nickname:${nickname.trim().toLowerCase()}`);
    const account = id ? await this.loadAccount(id) : undefined;
    if (!account) return { ok: false as const, reason: "Nickname ou senha incorretos." };
    const valid = await CryptoService.verify(password, account.passwordHash);
    if (!valid) return { ok: false as const, reason: "Nickname ou senha incorretos." };
    return { ok: true as const, profile: this.toPublicProfile(account) };
  }

  private toPublicProfile(account: Account) {
    return { id: account.id, nickname: account.nickname, createdAt: account.createdAt };
  }

  /**
   * Sprint RANKING-01 — Fase 2 ("migração retrocompatível"). Único
   * ponto de leitura de uma `Account` a partir do `accountId` — toda
   * conta antiga sem `stats` recebe os valores padrão aqui, e a
   * migração é persistida de volta (então só acontece uma vez por
   * conta). Nunca apaga `nickname`/`email`/`passwordHash`/`createdAt`
   * — só adiciona `stats` quando ausente.
   */
  private async loadAccount(id: string): Promise<Account | undefined> {
    const raw = await this.ctx.storage.get<Account>(`account:${id}`);
    if (!raw) return undefined;
    if (raw.stats) return raw;
    const migrated: Account = { ...raw, stats: defaultPlayerStats() };
    await this.ctx.storage.put(`account:${id}`, migrated);
    return migrated;
  }

  private async createSession(accountId: string): Promise<Session> {
    const session: Session = { token: crypto.randomUUID(), accountId, createdAt: Date.now() };
    await this.ctx.storage.put(`session:${session.token}`, session);
    return session;
  }

  /** Reatribui uma conexão nova a uma conta já autenticada, usando o token salvo no cliente. */
  private async resumeSession(token: string) {
    const session = await this.ctx.storage.get<Session>(`session:${token}`);
    if (!session) return { ok: false as const, reason: "Sessão expirada. Faça login novamente." };
    const account = await this.loadAccount(session.accountId);
    if (!account) return { ok: false as const, reason: "Conta não encontrada." };
    return { ok: true as const, token: session.token, profile: this.toPublicProfile(account) };
  }

  // ── Transporte / eventos de rede ────────────────────────────────

  private send(conn: TransportConnection, event: ServerEvent): void {
    conn.send(JSON.stringify(event));
  }

  private handleConnect(conn: TransportConnection): void {
    const player: ConnectedPlayer = {
      playerId: crypto.randomUUID(),
      playerName: "Comandante",
      accountId: null,
      nickname: null,
    };
    this.playersByConnection.set(conn.id, player);
    this.send(conn, { type: "PlayerConnected", playerId: player.playerId });
  }

  private handleClose(conn: TransportConnection): void {
    this.playersByConnection.delete(conn.id);
  }

  private async handleMessage(conn: TransportConnection, raw: string): Promise<void> {
    const player = this.playersByConnection.get(conn.id);
    if (!player) return;

    let event: ClientEvent;
    try {
      event = JSON.parse(raw) as ClientEvent;
    } catch {
      this.send(conn, { type: "ActionRejected", reason: "Mensagem inválida." });
      return;
    }

    switch (event.type) {
      case "Register": {
        const result = await this.register(event.nickname, event.email, event.password);
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        const session = await this.createSession(result.profile.id);
        player.accountId = result.profile.id;
        player.nickname = result.profile.nickname;
        player.playerName = result.profile.nickname;
        this.send(conn, {
          type: "AuthSuccess",
          token: session.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "Login": {
        const result = await this.login(event.nickname, event.password);
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        const session = await this.createSession(result.profile.id);
        player.accountId = result.profile.id;
        player.nickname = result.profile.nickname;
        player.playerName = result.profile.nickname;
        this.send(conn, {
          type: "AuthSuccess",
          token: session.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "ResumeSession": {
        const result = await this.resumeSession(event.token);
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        player.accountId = result.profile.id;
        player.nickname = result.profile.nickname;
        player.playerName = result.profile.nickname;
        this.send(conn, {
          type: "AuthSuccess",
          token: result.token,
          profile: { accountId: result.profile.id, nickname: result.profile.nickname, createdAt: result.profile.createdAt },
        });
        break;
      }

      case "Logout": {
        player.accountId = null;
        player.nickname = null;
        break;
      }

      case "CreateRoom": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado para jogar online." });
          break;
        }
        const roomId = crypto.randomUUID().slice(0, 8);
        // Sprint RANKING-01 — `matchType` só é aceito de quem CRIA a
        // sala; hoje sempre "casual" quando ausente (Direcionamento
        // Oficial #5/#6 — nenhum fluxo atual manda "ranked").
        const added = await this.addPlayerToRoom(
          roomId,
          player.playerId,
          player.nickname ?? player.playerName,
          player.accountId,
          event.matchType,
        );
        if (!added.ok) {
          this.send(conn, { type: "ActionRejected", reason: added.reason ?? "Não foi possível criar a sala." });
          break;
        }
        await this.ctx.storage.put(`room:${roomId}`, true);
        this.send(conn, { type: "RoomCreated", roomId, you: added.player });
        break;
      }

      case "JoinRoom": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado para jogar online." });
          break;
        }
        // Normalização única — a Interface pode exibir o código em
        // MAIÚSCULAS (só visual), mas o servidor trabalha exclusivamente
        // com minúsculas, igual ao roomId original de `CreateRoom`.
        const roomId = event.roomId.trim().toLowerCase();
        const roomExists = await this.ctx.storage.get(`room:${roomId}`);
        if (!roomExists) {
          this.send(conn, { type: "ActionRejected", reason: "Sala não encontrada." });
          break;
        }
        const added = await this.addPlayerToRoom(roomId, player.playerId, player.nickname ?? player.playerName, player.accountId);
        if (!added.ok) {
          this.send(conn, { type: "ActionRejected", reason: added.reason ?? "Não foi possível entrar na sala." });
          break;
        }
        this.send(conn, { type: "RoomJoined", roomId, you: added.player, players: added.players ?? [added.player] });
        break;
      }

      case "LeaveRoom": {
        // Só chega aqui se o jogador nunca reconectou à GameRoom (ex.: desistiu
        // antes da tela de espera terminar de trocar de socket) — nada a fazer,
        // a GameRoom trata LeaveRoom normalmente depois da reconexão.
        break;
      }

      case "GetLeaderboard": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado." });
          break;
        }
        const entries = this.getLeaderboardRows(event.limit ?? 50);
        this.send(conn, { type: "LeaderboardData", entries });
        break;
      }

      case "GetMyStats": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado." });
          break;
        }
        const account = await this.loadAccount(player.accountId);
        this.send(conn, { type: "MyStatsData", stats: account ? this.toMyStatsData(account) : null });
        break;
      }

      case "GetMatchHistory": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado." });
          break;
        }
        const matches = this.getMatchHistory(player.accountId, event.limit ?? 20);
        this.send(conn, { type: "MatchHistoryData", matches });
        break;
      }

      default:
        break;
    }
  }

  /** Registra o jogador na GameRoom (Durable Object própria da sala) via chamada interna DO-a-DO. */
  private async addPlayerToRoom(
    roomId: string,
    playerId: PlayerId,
    playerName: string,
    accountId: string,
    matchType?: MatchType,
  ): Promise<{ ok: true; player: RoomPlayerInfo; players?: RoomPlayerInfo[] } | { ok: false; reason?: string }> {
    const stub = this.env.ROOM.get(this.env.ROOM.idFromName(roomId));
    const response = await stub.fetch("https://internal/internal/add-player", {
      method: "POST",
      // Manda o roomId curto (canônico) junto — é assim que a GameRoom
      // aprende seu próprio roomId (Sprint QA-07); nunca usa o ID
      // interno de 64 caracteres da Durable Object para nada visível ao cliente.
      body: JSON.stringify({ roomId, playerId, playerName, accountId, matchType }),
    });
    return (await response.json()) as
      | { ok: true; player: RoomPlayerInfo; players?: RoomPlayerInfo[] }
      | { ok: false; reason?: string };
  }
}
