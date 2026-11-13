// Camada 2 — contrato único de eventos de rede (Cliente <-> Servidor).
//
// Este arquivo não contém nenhuma regra de jogo — só os "envelopes"
// que carregam intenções do jogador até o servidor e o novo estado
// autoritativo de volta. É importado tanto pelo cliente
// (`src/multiplayer/NetworkClient.ts`) quanto pelo servidor
// (`server/src/*`), garantindo que os dois lados nunca divirjam sobre
// o formato dos eventos.

import type { GameState, Pace, Player } from "@/types/gameState";
import type { Piece, PieceId } from "@/types/piece";
import type { SkinTable } from "@/config/skinCatalog";
import type { LeaderboardEntry, MatchHistoryEntry, MatchType, MyStatsData, RankingResultView } from "@/types/ranking";

export type RoomId = string;
export type PlayerId = string;

/** Estados possíveis de uma sala (fluxo oficial — doc 10). */
export type RoomStatus = "waiting" | "ready" | "deployment" | "playing" | "finished";

// ─────────────────────────────────────────────────────────────────
// Cliente → Servidor
// ─────────────────────────────────────────────────────────────────

export type ClientEvent =
  // Sistema de Contas (doc 16) — obrigatório para qualquer ação abaixo.
  | { type: "Register"; nickname: string; email: string; password: string }
  /** `nickname` aceita o nickname OU o e-mail da conta (docs/16 - Sistema de Contas, "Entrar"). */
  | { type: "Login"; nickname: string; password: string }
  /** Confirmação de e-mail do cadastro: o código de 6 dígitos recebido por e-mail (docs/16 - Sistema de Contas). */
  | { type: "VerifyEmail"; nickname: string; code: string }
  /** Pede um novo código de confirmação (com espera entre pedidos). */
  | { type: "ResendVerification"; nickname: string }
  /** "Esqueci minha senha": pede o código de redefinição. `identifier` é o nickname ou o e-mail. */
  | { type: "ForgotPassword"; identifier: string }
  /** Troca a senha com o código recebido por e-mail. */
  | { type: "ResetPassword"; identifier: string; code: string; newPassword: string }
  /**
   * Sprint QA-03 — reautentica uma conexão NOVA usando o token já salvo
   * no cliente (`AuthClient.readSession`), sem pedir senha de novo.
   * Necessário porque a autenticação vive por conexão WebSocket — toda
   * vez que o socket é recriado (ex.: voltar ao Lobby depois de entrar
   * numa sala), a conexão nasce sem `accountId` até isso ser enviado.
   */
  | { type: "ResumeSession"; token: string }
  | { type: "Logout" }
  /**
   * Sprint RANKING-01 — `matchType` é opcional e por enquanto sempre
   * vira "casual" quando ausente: as salas por código continuam
   * casuais exatamente como hoje (Direcionamento Oficial #5/#6). O
   * campo só existe pra deixar `GameRoom` pronta pra receber "ranked"
   * quando o matchmaking automático (RANKING-03) existir — nenhum
   * fluxo atual manda "ranked".
   */
  | { type: "CreateRoom"; playerName?: string; matchType?: MatchType; /** Modo da sala (tamanho do tabuleiro e do exército). Ausente = Partida Intensa. */ pace?: Pace }
  | { type: "JoinRoom"; roomId: RoomId; playerName?: string }
  | { type: "LeaveRoom" }
  | { type: "PlayerReady" }
  | { type: "ConfirmDeployment"; pieces: Piece[] }
  /**
   * Oficina do Exército (etapa 4) — o visual (só aparência) que este jogador escolheu pras
   * peças dele. O servidor SEMPRE revalida com `sanitizeSkins` e nunca confia no que chega;
   * qualquer valor fora do catálogo vira o visual padrão. Não altera nenhuma regra.
   */
  | { type: "SetSkins"; skins: SkinTable }
  /** Sprint RANKING-01 — Fase 9/11/12: buscar o Ranking global e as estatísticas do jogador logado. */
  | { type: "GetLeaderboard"; limit?: number; /** Modo do ranking. Ausente = Partida Intensa. */ pace?: Pace }
  | { type: "GetMyStats"; /** Modo das estatísticas. Ausente = Partida Intensa. */ pace?: Pace }
  /** Sprint RANKING-02 — Fase 4: histórico de partidas do jogador logado (casuais + ranqueadas). */
  | { type: "GetMatchHistory"; limit?: number }
  // Sprint SEC-01 — "SelectPiece" foi removido do protocolo de
  // propósito: seleção de peça é puramente client-side (nunca envolve
  // o servidor) para não vazar o alcance de movimento — e portanto o
  // tipo — de uma peça escondida pelo Fog of War pra tela do
  // adversário. Ver `OnlineGameStateProvider.tsx`.
  //
  // Sprint QA-R02-01 — a remoção do "SelectPiece" acima deixou o
  // servidor sem NENHUMA forma de saber qual peça mover: `MovePiece`
  // só carregava `{row, column}`, e o Motor (`GameEngine.moveSelectedTo`)
  // sempre dependeu de `state.selectedPieceId` já estar setado — campo
  // que nunca mais era escrito no servidor, fazendo todo movimento
  // virar `ActionRejected` pros dois jogadores. `pieceId` volta a
  // viajar (só a intenção "mover ESTA peça minha", nunca um destino
  // revelado ao adversário — `GameRoom` valida a seleção no servidor
  // com a MESMA função pura de sempre, `GameEngine.selectPiece`, antes
  // de aplicar o movimento; nunca rebroadcasta a seleção em si).
  | { type: "MovePiece"; pieceId: PieceId; row: number; column: number }
  | { type: "EndTurn" };

// ─────────────────────────────────────────────────────────────────
// Servidor → Cliente
// ─────────────────────────────────────────────────────────────────

export interface RoomPlayerInfo {
  playerId: PlayerId;
  playerName: string;
  owner: "blue" | "red";
  /**
   * Sprint RANKING-01 — necessário pra `GameRoom` saber DE QUEM
   * atualizar o Rating no fim de uma partida ranqueada (o Rating vive
   * na conta persistente, nunca no `playerId` efêmero da conexão).
   * Sempre presente hoje: `CreateRoom`/`JoinRoom` já exigem uma conta
   * autenticada (ver `AccountsRoom`).
   */
  accountId: string;
}

/** Perfil público devolvido após Register/Login — nunca inclui senha/hash. */
export interface AuthenticatedProfile {
  accountId: string;
  nickname: string;
  createdAt: number;
}

export type ServerEvent =
  | { type: "AuthSuccess"; token: string; profile: AuthenticatedProfile }
  | { type: "AuthError"; reason: string }
  /**
   * A conta existe mas o e-mail ainda não foi confirmado: a tela pede o código. `email` vem mascarado.
   * `devCode` só aparece no desenvolvimento local (`DEV_SHOW_CODE=1`).
   */
  | { type: "VerificationRequired"; nickname: string; email: string; devCode?: string }
  /** O código de redefinição de senha foi enviado (`email` mascarado; `devCode` só no desenvolvimento local). */
  | { type: "PasswordResetSent"; nickname: string; email: string; devCode?: string }
  /** A senha foi trocada: a tela volta ao login. */
  | { type: "PasswordResetDone" }
  | { type: "PlayerConnected"; playerId: PlayerId }
  /**
   * Sprint REC-01 — antes derrubava o jogador da sala na hora
   * (`GameRoom.removePlayer` imediato), o que também travava o F5:
   * mesmo reconectando rápido com o `playerId` certo, a vaga já tinha
   * sido apagada. Agora, se a sala já estiver em "deployment"/"playing",
   * o servidor só marca a desconexão e dá `reconnectDeadline` (epoch
   * ms) pro jogador voltar — a sala nunca é encerrada nesse momento.
   * `reconnectDeadline` é `null` quando a desconexão aconteceu antes
   * da Partida começar (sala "waiting"/"ready"), caso em que a vaga é
   * liberada de verdade, como antes.
   */
  | { type: "PlayerDisconnected"; playerId: PlayerId; reconnectDeadline: number | null }
  /** Sprint REC-01 — o jogador voltou dentro do prazo; some o aviso de desconexão no adversário. */
  | { type: "PlayerReconnected"; playerId: PlayerId }
  | { type: "RoomCreated"; roomId: RoomId; you: RoomPlayerInfo; pace: Pace }
  | { type: "RoomJoined"; roomId: RoomId; you: RoomPlayerInfo; players: RoomPlayerInfo[]; pace: Pace }
  /**
   * Disparado sempre que a sala muda de fase (jogador entrou, ficou
   * pronto, confirmou o posicionamento) — a Interface usa isso para
   * decidir para qual tela avançar, sem nunca reconstruir esse estado
   * sozinha (doc 10).
   */
  | {
      type: "RoomStateChanged";
      roomId: RoomId;
      status: RoomStatus;
      players: RoomPlayerInfo[];
      readyPlayerIds: PlayerId[];
      deployedPlayerIds: PlayerId[];
      /**
       * Sprint TIMER-01 — prazo oficial (epoch ms) do fim da fase de
       * Posicionamento, definido pelo servidor no instante em que a
       * sala entra em `"deployment"` (`GameRoom.markReady`). `null`
       * antes disso. Única fonte de verdade do cronômetro — os dois
       * clientes recebem exatamente o mesmo valor, nunca calculam um
       * prazo próprio.
       */
      deploymentDeadline: number | null;
      /**
       * Sprint RANKING-03 — o mesmo `matchType` que já existia desde a
       * RANKING-01 (`GameRoom`, decidido uma única vez na criação da
       * sala) passa a ser exposto também aqui — antes só chegava ao
       * cliente no `GameFinished`, no fim da partida, deixando Sala de
       * Espera/Posicionamento sem nenhuma forma de saber qual modo a
       * partida é. Nenhum campo novo de conceito, só o único
       * `matchType` de sempre viajando mais cedo.
       */
      matchType: MatchType;
      /** Modo da sala: define o tabuleiro e o exército. */
      pace: Pace;
    }
  /**
   * Sprint TIMER-01 — `matchStartTime` (epoch ms) é o instante em que o
   * servidor criou a `GameSession` (os dois jogadores confirmaram, ou o
   * alarme de posicionamento venceu) — mesma fonte pros dois clientes,
   * nunca `Date.now()` local.
   *
   * Sprint RANKING-03 — `matchType` também viaja aqui (mesmo campo de
   * `RoomStateChanged`/`GameFinished`), pra HUD da Partida poder
   * mostrar CASUAL/RANQUEADA durante toda a batalha, não só no fim.
   */
  | { type: "GameStarted"; state: GameState; matchStartTime: number; matchType: MatchType }
  /**
   * Envelope único para qualquer ação validada pelo Motor
   * (MovePiece/SelectPiece/EndTurn) — sempre carrega o `GameState`
   * completo e novo, nunca um diff. O cliente nunca reconstrói o
   * estado sozinho (doc 10).
   */
  | { type: "ActionApplied"; state: GameState; appliedBy: PlayerId }
  /**
   * Sprint TIMER-01 — `matchStartTime`/`matchEndTime` vêm do servidor,
   * garantindo o mesmo tempo final pros dois jogadores. Sprint REC-01 —
   * `reason` distingue uma vitória por combate ("victory", padrão) de
   * uma vitória por desistência/desconexão do adversário ("forfeit"),
   * pra tela final poder mostrar o texto certo.
   *
   * Sprint RANKING-01 — `matchType` sempre presente ("casual" nas
   * salas por código de hoje); `ranking` é o resultado de Rating
   * relativo a QUEM RECEBE este evento especificamente (por isso
   * `GameRoom` manda um envelope por conexão em vez de um broadcast
   * único — ver `GameRoom.sendGameFinished`) — `null` numa partida
   * casual ou se o processamento de Rating falhar por qualquer
   * motivo (a Partida nunca deixa de terminar por causa disso).
   */
  | {
      type: "GameFinished";
      winner: Player;
      state: GameState;
      matchStartTime: number;
      matchEndTime: number;
      reason?: "victory" | "forfeit";
      matchType: MatchType;
      ranking: RankingResultView | null;
    }
  /**
   * Visual de cada lado, já validado pelo servidor. Chega ao entrar/reconectar e sempre que um
   * jogador muda a escolha. Não é informação oculta: só diz como cada TIPO de peça é desenhado,
   * nunca onde as peças estão nem qual peça é qual no tabuleiro (isso continua no Fog of War).
   */
  | { type: "SkinsUpdated"; skins: Partial<Record<"blue" | "red", SkinTable>> }
  | { type: "ActionRejected"; reason: string }
  /** Sprint RANKING-01 — Fase 10. Nunca inclui dado privado de conta. */
  | { type: "LeaderboardData"; entries: LeaderboardEntry[]; pace: Pace }
  /** Sprint RANKING-01 — Fase 12/13. `stats` é `null` só se a conta não existir mais (sessão órfã). */
  | { type: "MyStatsData"; stats: MyStatsData | null; pace: Pace }
  /** Sprint RANKING-02 — Fase 1/4. Já ordenado `finishedAt DESC`, já limitado ao `limit` pedido. `[]` se o jogador nunca terminou uma partida. */
  | { type: "MatchHistoryData"; matches: MatchHistoryEntry[] };

export interface RoomSnapshot {
  roomId: RoomId;
  players: RoomPlayerInfo[];
  state: GameState | null;
}
