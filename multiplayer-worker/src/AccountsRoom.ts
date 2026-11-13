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
import type { Pace } from "@/types/gameState";
import { normalizePace } from "@/services/battleFormat";
import type { Env } from "./env";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MS,
  MAX_SENDS_PER_HOUR,
  PENDING_TTL_MS,
  RESEND_COOLDOWN_MS,
  generateCode,
  hashCode,
  isValidEmail,
  maskEmail,
  normalizeEmail,
  sendCodeEmail,
  type CodePurpose,
} from "./emailVerification";

interface Account {
  id: string;
  nickname: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  /**
   * Confirmação de e-mail (docs/16 - Sistema de Contas). `false` = cadastro ainda sem o código
   * confirmado. Ausente em contas criadas antes desta regra: elas contam como confirmadas.
   */
  emailVerified?: boolean;
  /**
   * Sprint RANKING-01 — opcional na FORMA persistida porque contas
   * criadas antes desta sprint não têm este campo gravado. Nunca lido
   * direto do storage fora de `loadAccount` — só ali a migração
   * (Fase 2, "conta antiga sem stats recebe stats padrão") acontece,
   * um único lugar, sem duplicar a lógica de "conta antiga" em cada
   * ponto que hoje já lê uma `Account` (`login`, `resumeSession`).
   */
  stats?: PlayerStats;
  /**
   * Ranqueada por modo (docs/16 - Sistema de Contas): `stats` guarda a pontuação da Partida Intensa
   * (`classic`, o único modo online até então); os outros modos ficam aqui. Ausente = ainda não jogou.
   */
  statsByPace?: Partial<Record<Exclude<Pace, "classic">, PlayerStats>>;
}

/** Estatísticas de uma conta em um modo (os padrões, se ela ainda não jogou ranqueada nele). */
function statsOf(account: Account, pace: Pace): PlayerStats {
  if (pace === "classic") return account.stats ?? defaultPlayerStats();
  return account.statsByPace?.[pace] ?? defaultPlayerStats();
}

/** Devolve a conta com as estatísticas de um modo trocadas (as dos outros modos não mudam). */
function withStats(account: Account, pace: Pace, stats: PlayerStats): Account {
  if (pace === "classic") return { ...account, stats };
  return { ...account, statsByPace: { ...account.statsByPace, [pace]: stats } };
}

/** Limite de senhas erradas por conta (chave `loginfail:<accountId>`): 8 erros em 15 min bloqueiam por 15 min. */
const LOGIN_MAX_FAILS = 8;
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_BLOCK_MS = 15 * 60_000;
interface LoginFails {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

/** Código em andamento de uma conta: confirmação do cadastro (`verify:<accountId>`) ou redefinição de senha (`reset:<accountId>`). */
interface EmailVerification {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  windowStart: number;
  sends: number;
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
  /** Modo da partida (ausente = Partida Intensa). */
  pace?: Pace;
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
  pace?: Pace;
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
  pace: string;
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
    // Ranqueada por modo: uma linha por (conta, modo). A tabela antiga `leaderboard` (só um modo) é copiada
    // uma vez como Partida Intensa e deixa de ser usada.
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS leaderboard_modes (
        accountId TEXT NOT NULL,
        pace TEXT NOT NULL,
        username TEXT NOT NULL,
        rating INTEGER NOT NULL,
        wins INTEGER NOT NULL,
        losses INTEGER NOT NULL,
        rankedMatches INTEGER NOT NULL,
        PRIMARY KEY (accountId, pace)
      )
    `);
    this.ctx.storage.sql.exec(`
      INSERT OR IGNORE INTO leaderboard_modes (accountId, pace, username, rating, wins, losses, rankedMatches)
      SELECT accountId, 'classic', username, rating, wins, losses, rankedMatches FROM leaderboard
    `);
    // O histórico guarda o modo de cada partida (as antigas contam como Partida Intensa).
    const historyCols = this.ctx.storage.sql.exec<{ name: string }>(`PRAGMA table_info(match_history)`).toArray();
    if (!historyCols.some((c) => c.name === "pace")) {
      this.ctx.storage.sql.exec(`ALTER TABLE match_history ADD COLUMN pace TEXT NOT NULL DEFAULT 'classic'`);
    }
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
         winnerRatingBefore, winnerRatingAfter, loserRatingBefore, loserRatingAfter, pace
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      normalizePace(input.pace),
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
      pace: normalizePace(row.pace),
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
  private upsertLeaderboardRow(account: Account, pace: Pace): void {
    this.ensureSchema();
    const stats = statsOf(account, pace);
    if (stats.rankedMatches <= 0) {
      this.ctx.storage.sql.exec(`DELETE FROM leaderboard_modes WHERE accountId = ? AND pace = ?`, account.id, pace);
      return;
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO leaderboard_modes (accountId, pace, username, rating, wins, losses, rankedMatches)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(accountId, pace) DO UPDATE SET
         username = excluded.username,
         rating = excluded.rating,
         wins = excluded.wins,
         losses = excluded.losses,
         rankedMatches = excluded.rankedMatches`,
      account.id,
      pace,
      account.nickname,
      stats.rating,
      stats.wins,
      stats.losses,
      stats.rankedMatches,
    );
  }

  /** Fase 10 — ordenação oficial: rating DESC, wins DESC, rankedMatches ASC, username ASC (um placar por modo). */
  private getLeaderboardRows(limit: number, pace: Pace): LeaderboardEntry[] {
    this.ensureSchema();
    const cursor = this.ctx.storage.sql.exec<{
      accountId: string;
      username: string;
      rating: number;
      wins: number;
      losses: number;
      rankedMatches: number;
    }>(
      `SELECT accountId, username, rating, wins, losses, rankedMatches FROM leaderboard_modes
       WHERE pace = ?
       ORDER BY rating DESC, wins DESC, rankedMatches ASC, username ASC
       LIMIT ?`,
      pace,
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
   * Fase 12 — posição do jogador no Ranking do modo, mesmo que ele não
   * apareça no TOP N retornado por `getLeaderboardRows`. `null` quando
   * a conta ainda não tem linha na tabela (Fase 13 — nenhuma partida
   * ranqueada completada ainda nesse modo).
   */
  private getPlayerPosition(accountId: string, pace: Pace): number | null {
    this.ensureSchema();
    const rowCursor = this.ctx.storage.sql.exec<{
      rating: number;
      wins: number;
      rankedMatches: number;
      username: string;
    }>(`SELECT rating, wins, rankedMatches, username FROM leaderboard_modes WHERE accountId = ? AND pace = ?`, accountId, pace);
    const row = rowCursor.toArray()[0];
    if (!row) return null;

    const countCursor = this.ctx.storage.sql.exec<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM leaderboard_modes WHERE pace = ? AND (
         rating > ?
         OR (rating = ? AND wins > ?)
         OR (rating = ? AND wins = ? AND rankedMatches < ?)
         OR (rating = ? AND wins = ? AND rankedMatches = ? AND username < ?))`,
      pace,
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
  private toMyStatsData(account: Account, pace: Pace): MyStatsData {
    const stats = statsOf(account, pace);
    return {
      accountId: account.id,
      username: account.nickname,
      rating: stats.rating,
      rankTier: getRankTier(stats.rating),
      rankedMatches: stats.rankedMatches,
      wins: stats.wins,
      losses: stats.losses,
      winRate: calculateWinRate(stats.wins, stats.losses),
      position: this.getPlayerPosition(account.id, pace),
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
    const pace = normalizePace(input.pace);
    const winnerStatsBefore = statsOf(winnerAccount, pace);
    const loserStatsBefore = statsOf(loserAccount, pace);
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

    const winnerUpdated: Account = withStats(winnerAccount, pace, winnerStats);
    const loserUpdated: Account = withStats(loserAccount, pace, loserStats);
    await this.ctx.storage.put(`account:${winnerUpdated.id}`, winnerUpdated);
    await this.ctx.storage.put(`account:${loserUpdated.id}`, loserUpdated);
    this.upsertLeaderboardRow(winnerUpdated, pace);
    this.upsertLeaderboardRow(loserUpdated, pace);

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
      pace,
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
    if (!isValidEmail(email)) {
      return { ok: false as const, reason: "Informe um e-mail válido." };
    }
    const emailKey = `email:${normalizeEmail(email)}`;
    await this.purgeStalePending(`nickname:${key}`);
    await this.purgeStalePending(emailKey);
    const existingId = await this.ctx.storage.get<string>(`nickname:${key}`);
    if (existingId) {
      const existing = await this.ctx.storage.get<Account>(`account:${existingId}`);
      return {
        ok: false as const,
        reason:
          existing?.emailVerified === false
            ? "Este nickname está aguardando confirmação. Se foi você, entre com a senha para receber um novo código."
            : "Este nickname já está em uso.",
      };
    }
    if (await this.ctx.storage.get<string>(emailKey)) {
      return { ok: false as const, reason: "Este e-mail já está em uso." };
    }
    const account: Account = {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      email: email.trim(),
      passwordHash: await CryptoService.hash(password),
      createdAt: Date.now(),
      emailVerified: false,
      // Sprint RANKING-01 — Direcionamento Oficial #1: todo jogador
      // novo começa com exatamente 500 pontos.
      stats: defaultPlayerStats(),
    };
    await this.ctx.storage.put(`account:${account.id}`, account);
    await this.ctx.storage.put(`nickname:${key}`, account.id);
    await this.ctx.storage.put(emailKey, account.id);
    const sent = await this.issueCode(account);
    if (!sent.ok) {
      // Sem como entregar o código a conta não serve: desfaz o cadastro por inteiro.
      await this.ctx.storage.delete([`account:${account.id}`, `nickname:${key}`, emailKey, `verify:${account.id}`]);
      return { ok: false as const, reason: sent.reason };
    }
    return { ok: true as const, account, devCode: sent.devCode };
  }

  /** Acha a conta pelo nickname ou pelo e-mail (quem tem "@" é procurado como e-mail). */
  private async findAccount(identifier: string): Promise<Account | undefined> {
    const text = String(identifier ?? "").trim();
    if (!text) return undefined;
    const indexKey = text.includes("@") ? `email:${normalizeEmail(text)}` : `nickname:${text.toLowerCase()}`;
    const id = await this.ctx.storage.get<string>(indexKey);
    return id ? await this.loadAccount(id) : undefined;
  }

  private async login(identifier: string, password: string) {
    if (!String(identifier ?? "").trim()) return { ok: false as const, reason: "Informe seu usuário ou e-mail." };
    if (!password) return { ok: false as const, reason: "Digite sua senha." };
    const account = await this.findAccount(identifier);
    if (!account) return { ok: false as const, reason: "Usuário ou e-mail não encontrado." };
    const failKey = `loginfail:${account.id}`;
    const fails = await this.ctx.storage.get<LoginFails>(failKey);
    const now = Date.now();
    if (fails && fails.blockedUntil > now) {
      const min = Math.max(1, Math.ceil((fails.blockedUntil - now) / 60_000));
      return { ok: false as const, reason: `Muitas tentativas. Tente de novo em ${min} min.` };
    }
    const valid = await CryptoService.verify(password, account.passwordHash);
    if (!valid) {
      const fresh = !fails || now - fails.windowStart > LOGIN_WINDOW_MS;
      const count = fresh ? 1 : fails.count + 1;
      const next: LoginFails = { count, windowStart: fresh ? now : fails.windowStart, blockedUntil: count >= LOGIN_MAX_FAILS ? now + LOGIN_BLOCK_MS : 0 };
      await this.ctx.storage.put(failKey, next);
      return { ok: false as const, reason: count >= LOGIN_MAX_FAILS ? `Senha incorreta. Muitas tentativas: tente de novo em ${LOGIN_BLOCK_MS / 60_000} min.` : "Senha incorreta." };
    }
    if (fails) await this.ctx.storage.delete(failKey);
    if (account.emailVerified === false) return { ok: true as const, needsVerification: true as const, account };
    return { ok: true as const, needsVerification: false as const, profile: this.toPublicProfile(account) };
  }

  // ── Confirmação de e-mail ───────────────────────────────────────

  /** Uma conta que ficou mais de 24 h sem confirmar libera o nickname e o e-mail. */
  private async purgeStalePending(indexKey: string): Promise<void> {
    const id = await this.ctx.storage.get<string>(indexKey);
    if (!id) return;
    const acc = await this.ctx.storage.get<Account>(`account:${id}`);
    if (!acc || acc.emailVerified !== false || Date.now() - acc.createdAt < PENDING_TTL_MS) return;
    await this.ctx.storage.delete([
      `account:${id}`,
      `nickname:${acc.nickname.toLowerCase()}`,
      `email:${normalizeEmail(acc.email)}`,
      `verify:${id}`,
    ]);
  }

  /**
   * Gera um código novo, guarda só o hash e envia por e-mail. Respeita a espera entre pedidos e o
   * limite por hora. `kind` diz por que falhou: "limit" = pediu cedo demais (o código anterior ainda
   * vale), "failed" = o e-mail não saiu.
   */
  private async issueCode(account: Account, purpose: CodePurpose = "verify"): Promise<{ ok: true; devCode?: string } | { ok: false; reason: string; kind: "limit" | "failed" }> {
    const key = `${purpose}:${account.id}`;
    const prev = await this.ctx.storage.get<EmailVerification>(key);
    const now = Date.now();
    if (prev && now - prev.lastSentAt < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - prev.lastSentAt)) / 1000);
      return { ok: false, kind: "limit", reason: `Aguarde ${wait} s para pedir um novo código.` };
    }
    const inWindow = !!prev && now - prev.windowStart < 3_600_000;
    if (prev && inWindow && prev.sends >= MAX_SENDS_PER_HOUR) {
      return { ok: false, kind: "limit", reason: "Você pediu códigos demais. Tente de novo em alguns minutos." };
    }
    const code = generateCode();
    const sent = await sendCodeEmail(this.env, account.email, account.nickname, code, purpose);
    if (!sent.ok) return { ok: false, kind: "failed", reason: sent.reason };
    const record: EmailVerification = {
      codeHash: await hashCode(code, account.id),
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      windowStart: inWindow && prev ? prev.windowStart : now,
      sends: inWindow && prev ? prev.sends + 1 : 1,
    };
    await this.ctx.storage.put(key, record);
    return { ok: true, devCode: sent.devCode };
  }

  private async findPendingAccount(nickname: string): Promise<Account | undefined> {
    const id = await this.ctx.storage.get<string>(`nickname:${nickname.trim().toLowerCase()}`);
    const account = id ? await this.ctx.storage.get<Account>(`account:${id}`) : undefined;
    return account && account.emailVerified === false ? account : undefined;
  }

  /** Confere o código de 6 dígitos de uma conta (validade, tentativas e hash). Não apaga o código: quem chama faz isso. */
  private async checkCode(account: Account, key: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const rec = await this.ctx.storage.get<EmailVerification>(key);
    if (!rec) return { ok: false, reason: "Nenhum código ativo. Peça um novo código." };
    if (Date.now() > rec.expiresAt) return { ok: false, reason: "O código expirou. Peça um novo código." };
    if (rec.attempts >= CODE_MAX_ATTEMPTS) return { ok: false, reason: "Tentativas demais. Peça um novo código." };
    const given = code.replace(/\D/g, "");
    if ((await hashCode(given, account.id)) !== rec.codeHash) {
      const attempts = rec.attempts + 1;
      await this.ctx.storage.put(key, { ...rec, attempts });
      const left = CODE_MAX_ATTEMPTS - attempts;
      return { ok: false, reason: left > 0 ? `Código incorreto. Restam ${left} tentativas.` : "Código incorreto. Peça um novo código." };
    }
    return { ok: true };
  }

  private async verifyEmail(nickname: string, code: string) {
    const account = await this.findPendingAccount(nickname);
    if (!account) return { ok: false as const, reason: "Conta não encontrada ou já confirmada. Tente entrar." };
    const key = `verify:${account.id}`;
    const checked = await this.checkCode(account, key, code);
    if (!checked.ok) return { ok: false as const, reason: checked.reason };
    await this.ctx.storage.put(`account:${account.id}`, { ...account, emailVerified: true });
    await this.ctx.storage.delete(key);
    return { ok: true as const, profile: this.toPublicProfile(account) };
  }

  // ── Recuperação de senha (docs/16 - Sistema de Contas, "Esqueci minha senha") ──

  private async resetPassword(identifier: string, code: string, newPassword: string) {
    const account = await this.findAccount(identifier);
    if (!account) return { ok: false as const, reason: "Não encontramos uma conta com esse usuário ou e-mail." };
    // A senha nova é conferida antes de gastar uma tentativa do código.
    if (String(newPassword ?? "").length < 4) return { ok: false as const, reason: "A nova senha precisa ter pelo menos 4 caracteres." };
    const key = `reset:${account.id}`;
    const checked = await this.checkCode(account, key, String(code ?? ""));
    if (!checked.ok) return { ok: false as const, reason: checked.reason };
    // O código prova que o jogador tem acesso ao e-mail: a conta passa a valer como confirmada.
    await this.ctx.storage.put(`account:${account.id}`, {
      ...account,
      passwordHash: await CryptoService.hash(newPassword),
      emailVerified: true,
    });
    await this.ctx.storage.delete([key, `loginfail:${account.id}`, `verify:${account.id}`]);
    return { ok: true as const };
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
        // Sem sessão ainda: a conta só vale depois do código enviado por e-mail.
        this.send(conn, {
          type: "VerificationRequired",
          nickname: result.account.nickname,
          email: maskEmail(result.account.email),
          devCode: result.devCode,
        });
        break;
      }

      case "Login": {
        const result = await this.login(event.nickname, event.password);
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        if (result.needsVerification) {
          // Conta ainda sem e-mail confirmado: manda um código novo (se não pediu há pouco) e pede a confirmação.
          const sent = await this.issueCode(result.account);
          if (!sent.ok && sent.kind === "failed") {
            this.send(conn, { type: "AuthError", reason: sent.reason });
            break;
          }
          this.send(conn, {
            type: "VerificationRequired",
            nickname: result.account.nickname,
            email: maskEmail(result.account.email),
            devCode: sent.ok ? sent.devCode : undefined,
          });
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

      case "VerifyEmail": {
        const result = await this.verifyEmail(event.nickname, String(event.code ?? ""));
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

      case "ForgotPassword": {
        const account = await this.findAccount(event.identifier);
        if (!account) {
          this.send(conn, { type: "AuthError", reason: String(event.identifier ?? "").trim() ? "Não encontramos uma conta com esse usuário ou e-mail." : "Informe seu usuário ou e-mail." });
          break;
        }
        const sent = await this.issueCode(account, "reset");
        if (!sent.ok) {
          this.send(conn, { type: "AuthError", reason: sent.reason });
          break;
        }
        this.send(conn, { type: "PasswordResetSent", nickname: account.nickname, email: maskEmail(account.email), devCode: sent.devCode });
        break;
      }

      case "ResetPassword": {
        const result = await this.resetPassword(event.identifier, String(event.code ?? ""), String(event.newPassword ?? ""));
        if (!result.ok) {
          this.send(conn, { type: "AuthError", reason: result.reason });
          break;
        }
        this.send(conn, { type: "PasswordResetDone" });
        break;
      }

      case "ResendVerification": {
        const account = await this.findPendingAccount(event.nickname);
        if (!account) {
          this.send(conn, { type: "AuthError", reason: "Conta não encontrada ou já confirmada. Tente entrar." });
          break;
        }
        const sent = await this.issueCode(account);
        if (!sent.ok) {
          this.send(conn, { type: "AuthError", reason: sent.reason });
          break;
        }
        this.send(conn, { type: "VerificationRequired", nickname: account.nickname, email: maskEmail(account.email), devCode: sent.devCode });
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
          // Toda partida online é ranqueada: o `matchType` pedido pelo cliente é ignorado (docs/16, "Sem casual").
          "ranked",
          normalizePace(event.pace),
        );
        if (!added.ok) {
          this.send(conn, { type: "ActionRejected", reason: added.reason ?? "Não foi possível criar a sala." });
          break;
        }
        await this.ctx.storage.put(`room:${roomId}`, true);
        this.send(conn, { type: "RoomCreated", roomId, you: added.player, pace: added.pace });
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
        this.send(conn, { type: "RoomJoined", roomId, you: added.player, players: added.players ?? [added.player], pace: added.pace });
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
        const lbPace = normalizePace(event.pace);
        const entries = this.getLeaderboardRows(event.limit ?? 50, lbPace);
        this.send(conn, { type: "LeaderboardData", entries, pace: lbPace });
        break;
      }

      case "GetMyStats": {
        if (!player.accountId) {
          this.send(conn, { type: "AuthError", reason: "É preciso estar autenticado." });
          break;
        }
        const statsPace = normalizePace(event.pace);
        const account = await this.loadAccount(player.accountId);
        this.send(conn, { type: "MyStatsData", stats: account ? this.toMyStatsData(account, statsPace) : null, pace: statsPace });
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
    pace?: Pace,
  ): Promise<{ ok: true; player: RoomPlayerInfo; players?: RoomPlayerInfo[]; pace: Pace } | { ok: false; reason?: string }> {
    const stub = this.env.ROOM.get(this.env.ROOM.idFromName(roomId));
    const response = await stub.fetch("https://internal/internal/add-player", {
      method: "POST",
      // Manda o roomId curto (canônico) junto — é assim que a GameRoom
      // aprende seu próprio roomId (Sprint QA-07); nunca usa o ID
      // interno de 64 caracteres da Durable Object para nada visível ao cliente.
      body: JSON.stringify({ roomId, playerId, playerName, accountId, matchType, pace }),
    });
    return (await response.json()) as
      | { ok: true; player: RoomPlayerInfo; players?: RoomPlayerInfo[]; pace: Pace }
      | { ok: false; reason?: string };
  }
}
