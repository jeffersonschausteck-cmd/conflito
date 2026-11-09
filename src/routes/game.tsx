import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { BoardWithPieces } from "@/components/BoardWithPieces";
import { GameStateProvider, useGameState } from "@/hooks/useGameState";
import { RevealLogProvider } from "@/hooks/useRevealLog";
import { useAudioBridge } from "@/hooks/useAudioBridge";
import { useCountdown, useElapsed } from "@/hooks/useClock";
import { formatClock } from "@/lib/formatClock";
import { GameButton } from "@/components/ui/GameButton";
import { ScifiFrame } from "@/components/ui/ScifiFrame";
import { TopBar } from "@/components/game/TopBar";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { CommandCenter } from "@/components/game/CommandCenter";
import { Match3DScreen } from "@/components/kay/Match3DScreen";
import { MatchActionsBar } from "@/components/game/MatchActionsBar";
import { TerrainPanel } from "@/components/game/TerrainPanel";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import { rulesFor, winnerByPoints } from "@/services/matchRules";
import type { TerrainId } from "@/maps/types";
import { flowState } from "@/services/flowState";
import { OnlineGameStateProvider } from "@/multiplayer/OnlineGameStateProvider";
import { rehydrateGameState } from "@/multiplayer/NetworkClient";
import { ownerToPlayer, type GameState } from "@/types/gameState";
import type { PlayerOwner } from "@/types/piece";
import type { MatchType } from "@/types/ranking";

/**
 * Componente estável (fora de GamePage) para o provedor de estado do
 * jogo. Antes era declarado inline no corpo de GamePage, o que criava
 * uma nova referência de função a cada render — o React interpretava
 * isso como um tipo de componente diferente e desmontava/remontava
 * toda a subárvore (inclusive o GameStateProvider e seu reducer) a
 * cada clique, perdendo a seleção de peça. Hoisted para o módulo para
 * que a mesma instância sobreviva durante toda a partida.
 *
 * Sprint QA-11 — só chega aqui com `isOnline === true` quando
 * `onlineInitialState` já foi lido com sucesso (ver `GamePage`, que
 * intercepta qualquer falha antes de montar isto). Nunca decide entre
 * Provider online/offline sozinho — recebe `isOnline` já resolvido.
 *
 * Sprint QA-13 — repassa `localOwner` (fonte única da perspectiva do
 * jogador) pro Provider certo. `GameStateContext` passa a expor esse
 * valor pra toda a árvore via `useGameState().localOwner` — nenhum
 * componente deve mais assumir `"blue"` sozinho.
 */
function GameProvider({
  isOnline,
  onlineInitialState,
  onlineMatchStartTime,
  onlineMatchType,
  localOwner,
  children,
}: {
  isOnline: boolean;
  onlineInitialState: GameState | null;
  onlineMatchStartTime: number | null;
  onlineMatchType: MatchType;
  localOwner: PlayerOwner;
  children: ReactNode;
}) {
  return isOnline && onlineInitialState && onlineMatchStartTime !== null ? (
    <OnlineGameStateProvider
      initialState={onlineInitialState}
      localOwner={localOwner}
      matchStartTime={onlineMatchStartTime}
      matchType={onlineMatchType}
    >
      {children}
    </OnlineGameStateProvider>
  ) : (
    <GameStateProvider
      config={{
        rows: ACTIVE_MAP.rows,
        cols: ACTIVE_MAP.cols,
        blockedTiles: getBlockedTiles(ACTIVE_MAP),
        // Ritmo escolhido na tela de ritmo (Clássica = sem regras extras).
        rules: rulesFor(flowState.read().pace) ?? undefined,
      }}
      localOwner={localOwner}
    >
      {children}
    </GameStateProvider>
  );
}

/**
 * Sprint QA-11 — antes, qualquer falha ao reconstruir o `GameState`
 * salvo pelo Deployment (ex.: `sessionStorage` corrompido/ausente)
 * fazia `onlineInitialState` virar `null` silenciosamente, e
 * `GameProvider` caía pro modo OFFLINE sem nenhum aviso — o jogador
 * online acabava numa partida local sozinha, contra um "adversário"
 * que era só o posicionamento padrão do próprio Motor. Uma partida
 * online NUNCA deve virar offline por baixo dos panos: se `isOnline`
 * é `true` e a leitura falha, mostramos um erro explícito em vez de
 * iniciar silenciosamente uma partida offline.
 */
function OnlineSyncErrorScreen() {
  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center gap-4 overflow-hidden bg-background p-6 text-center text-foreground">
      <CyberBackground />
      <div className="relative z-10 flex max-w-md flex-col items-center gap-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-rose-400">
          Falha ao sincronizar a partida
        </h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar o estado da partida online recebido do servidor. Isso não é uma
          partida offline — volte para a sala e tente novamente.
        </p>
        <GameButton variant="primary" onClick={() => window.location.assign("/online-lobby")}>
          Voltar para a Sala Online
        </GameButton>
      </div>
    </main>
  );
}

/** Sprint AUDIO-01 — só existe pra dar um lugar, dentro do Provider, pra `useAudioBridge` rodar. */
function AudioBridge() {
  useAudioBridge();
  return null;
}

/**
 * Sprint REC-01 — aviso não-intrusivo (não altera o HUD existente, só
 * sobrepõe um banner no topo enquanto durar) de que o adversário caiu
 * e tem até 3 minutos pra voltar antes do W.O. `opponentDisconnectDeadline`
 * vem do servidor (`GameRoom` via `PlayerDisconnected`) — nunca calculado
 * localmente, mesmo padrão do cronômetro de Posicionamento (TIMER-01).
 */
function OpponentDisconnectBanner() {
  const { opponentDisconnectDeadline } = useGameState();
  const remainingMs = useCountdown(opponentDisconnectDeadline);

  if (opponentDisconnectDeadline === null) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center px-4 pt-3">
      <div className="pointer-events-auto rounded border border-amber-400/60 bg-amber-950/90 px-4 py-2 text-center shadow-lg backdrop-blur-sm">
        <p className="font-display text-xs font-bold uppercase tracking-[0.15em] text-amber-300">
          Adversário desconectado — {formatClock(remainingMs)} para retornar
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Conflito — Campo de Batalha" },
      {
        name: "description",
        content: "Campo de batalha tático do Conflito.",
      },
    ],
  }),
  component: GamePage,
});

// ─────────────────────────────────────────────────────────────
// GAME PAGE
// ─────────────────────────────────────────────────────────────

function GamePage() {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const isOnline = flowState.read().online === true;

  // Sprint QA-13 — fonte única da perspectiva do jogador. Offline é
  // sempre "blue" (partida local, um único humano); online vem do
  // `flow.onlineOwner` gravado em `online-lobby.tsx` a partir de
  // `RoomCreated`/`RoomJoined` (`you.owner`) — antes essa leitura
  // parava em `deployment.tsx` e nunca chegava até aqui, fazendo cada
  // componente (Fog of War, HUD, tela de vitória) assumir "blue" por
  // conta própria.
  const localOwner: PlayerOwner = isOnline ? flowState.read().onlineOwner ?? "blue" : "blue";

  // Sprint QA-11 — distingue "não é online" (`state: null`, sem erro)
  // de "é online, mas a leitura falhou" (`error: true`) — antes os dois
  // casos caíam no mesmo `null` e o Provider offline assumia os dois
  // silenciosamente.
  // Sprint TIMER-01 — `sessionStorage` agora guarda `{ state,
  // matchStartTime }` (não mais o `GameState` cru) — `matchStartTime`
  // ausente conta como falha de sincronização também, pelo mesmo
  // motivo: nunca cair silenciosamente pro modo offline.
  const {
    state: onlineInitialState,
    matchStartTime: onlineMatchStartTime,
    matchType: onlineMatchType,
    error: onlineSyncFailed,
  } = useMemo<{
    state: GameState | null;
    matchStartTime: number | null;
    matchType: MatchType;
    error: boolean;
  }>(() => {
    if (!isOnline || typeof window === "undefined") return { state: null, matchStartTime: null, matchType: "casual", error: false };
    try {
      const raw = window.sessionStorage.getItem("conflito:online-state");
      if (!raw) {
        console.error("[game] Sprint QA-11 — flow.online=true mas sessionStorage['conflito:online-state'] está vazio.");
        return { state: null, matchStartTime: null, matchType: "casual", error: true };
      }
      const parsed = JSON.parse(raw) as { state: GameState; matchStartTime: number; matchType?: MatchType };
      if (typeof parsed.matchStartTime !== "number") {
        console.error("[game] Sprint TIMER-01 — sessionStorage['conflito:online-state'] sem matchStartTime.");
        return { state: null, matchStartTime: null, matchType: "casual", error: true };
      }
      // Sprint RANKING-03 — `matchType` é só exibição (nunca decide
      // Rating/Elo, isso é 100% servidor); ausente conta como "casual"
      // em vez de falha dura, diferente de `matchStartTime` acima (que
      // governa o cronômetro real).
      return {
        state: rehydrateGameState(parsed.state),
        matchStartTime: parsed.matchStartTime,
        matchType: parsed.matchType ?? "casual",
        error: false,
      };
    } catch (err) {
      console.error("[game] Sprint QA-11 — falha ao reconstruir onlineInitialState:", err);
      return { state: null, matchStartTime: null, matchType: "casual", error: true };
    }
  }, [isOnline]);

  if (isOnline && onlineSyncFailed) {
    return <OnlineSyncErrorScreen />;
  }

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <CyberBackground />

      <GameProvider
        isOnline={isOnline}
        onlineInitialState={onlineInitialState}
        onlineMatchStartTime={onlineMatchStartTime}
        onlineMatchType={onlineMatchType}
        localOwner={localOwner}
      >
        <AudioBridge />
        <OpponentDisconnectBanner />
        <RevealLogProvider>
          {localOwner === "blue" ? (
            // Partida em 3D (visual novo). Só quem joga de Azul: a câmera do 3D ainda não gira para o Vermelho online.
            <Match3DScreen isOnline={isOnline} />
          ) : (
          <>
          {/* Grid de 2 linhas (TopBar/conteúdo) — sem faixa inferior, o
              tabuleiro ganha toda a altura restante. A linha de conteúdo
              (1fr) nunca cresce além do espaço real, então continua sem
              scroll em nenhuma resolução ou zoom. */}
          <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden">
            <TopBar />

            {/* LINHA PRINCIPAL — coluna inimigo+Terreno / tabuleiro / coluna jogador local+Peça.
                Sprint QA-13 — antes fixo Vermelho-esquerda/Azul-direita pros dois
                navegadores; agora a direita (perto do Comando) é sempre o lado
                de quem está jogando ali (`localOwner`), a esquerda o inimigo. */}
            <div className="flex min-h-0 items-stretch gap-[clamp(0.3rem,1.2vw,1rem)] overflow-hidden px-[clamp(0.3rem,1.2vw,1rem)] py-[clamp(0.2rem,0.8vh,1rem)]">
              {/* COLUNA ESQUERDA — Inimigo + Reconhecimento de Terreno.
                  Sprint MOBILE-01 — largura fixa (260px) sobrava demais em
                  telas de celular na horizontal (~700-820px de largura),
                  espremendo o tabuleiro; agora escala com a viewport
                  (clamp) até o mesmo teto de sempre em telas grandes. */}
              <div className="flex w-[clamp(84px,13vw,260px)] min-h-0 shrink-0 flex-col gap-[clamp(0.2rem,1vh,1rem)]">
                <div className="min-h-0 flex-1">
                  <PlayerPanel owner="blue" />
                </div>
                <div className="min-h-0 flex-1">
                  <TerrainPanel
                    terrain={
                      selectedCell
                        ? (ACTIVE_MAP.tiles[selectedCell.row]?.[selectedCell.col] as TerrainId) ?? null
                        : null
                    }
                    row={selectedCell?.row}
                    col={selectedCell?.col}
                  />
                </div>
              </div>

              {/* TABULEIRO */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-[clamp(0.15rem,0.6vh,0.75rem)]">
                <div className="min-h-0 w-full flex-1">
                  <BoardWithPieces onTileClick={(row, col) => setSelectedCell({ row, col })} />
                </div>
                <MatchActionsBar isOnline={isOnline} />
              </div>

              {/* COLUNA DIREITA — Jogador local + Peça Selecionada */}
              <div className="flex w-[clamp(84px,13vw,260px)] min-h-0 shrink-0 flex-col gap-[clamp(0.2rem,1vh,1rem)]">
                <div className="min-h-0 flex-1">
                  <PlayerPanel owner={localOwner} />
                </div>
                <div className="min-h-0 flex-1">
                  <CommandCenter />
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          <GameOverOverlay />
        </RevealLogProvider>
      </GameProvider>
    </main>
  );
}


/* ========================================================================== */
/* FIM DA PARTIDA */
/* ========================================================================== */

function GameOverOverlay() {
  const { state, reset, localOwner, matchStartTime, matchEndTime, matchEndReason, rankingResult } = useGameState();
  // Sprint TIMER-01 — `endTime` fixo assim que a partida acaba: o
  // relógio para de contar e nunca mais muda, igual pros dois jogadores
  // (os dois valores vêm da mesma fonte — servidor online, mesmo
  // Provider offline).
  const matchDurationMs = useElapsed(matchStartTime, matchEndTime);

  if (!state.gameOver) return null;

  // Sprint QA-13 — vitória/derrota são relativas a quem está vendo a
  // tela (`localOwner`), não mais fixas em "BLUE". `loserLabel` continua
  // sendo o lado que de fato perdeu (independe da perspectiva).
  const isVictory = state.winner === ownerToPlayer(localOwner);
  const loserLabel = state.winner === "BLUE" ? "Vermelha" : "Azul";
  const byPoints = state.endReason === "points";
  const byTime = state.endReason === "time";
  const points = byPoints ? winnerByPoints(state) : null;

  const piecesAlive = (owner: "blue" | "red") =>
    state.pieces.filter((p) => p.owner === owner && p.isAlive).length;

  return (
    // Sprint MOBILE-01 — o overlay em si (`fixed inset-0`) fica fixo,
    // mas agora é ELE que rola internamente (`overflow-y-auto`) se o
    // conteúdo não couber — antes o conteúdo simplesmente vazava pra
    // fora da viewport numa tela curta de celular, sem barra de rolagem
    // nenhuma pra alcançar o botão "Nova Partida". Textos/paddings
    // também encolhem via media query de altura, pra normalmente nem
    // precisar rolar.
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 [@media(min-height:480px)]:p-4">
      {/* Overlay escuro com leve blur — o campo de batalha permanece visível ao fundo. */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
        className="relative z-10 my-auto w-full max-w-md text-center"
      >
        <h2
          id="game-over-title"
          className={`font-display text-lg font-bold uppercase tracking-[0.1em] [@media(min-height:480px)]:text-3xl [@media(min-height:480px)]:tracking-[0.12em] ${
            isVictory ? "text-cyan-300" : "text-rose-400"
          }`}
        >
          {byPoints ? (isVictory ? "VITÓRIA POR PONTOS" : "DERROTA POR PONTOS") : byTime ? (isVictory ? "VITÓRIA NO TEMPO" : "TEMPO ESGOTADO") : isVictory ? "MISSÃO CONCLUÍDA" : "MISSÃO FRACASSADA"}
        </h2>
        <p className="mt-1 text-[11px] text-slate-400 [@media(min-height:480px)]:mt-2 [@media(min-height:480px)]:text-sm">
          {byPoints
            ? "O limite de rodadas chegou. Vence quem somou mais pontos."
            : byTime
              ? isVictory
                ? "O relógio do adversário chegou a zero."
                : "O seu relógio chegou a zero."
              : isVictory
                ? "Sua ofensiva foi concluída com sucesso."
                : "O exército inimigo capturou sua Bandeira."}
        </p>

        <ScifiFrame
          variant={isVictory ? "cyan" : "red"}
          eyebrow="// RELATÓRIO"
          tabLabel="RESUMO DA PARTIDA"
          className="mt-2 text-left [@media(min-height:480px)]:mt-6"
        >
          <div className="space-y-1 [@media(min-height:480px)]:space-y-2">
            <SummaryRow label="Resultado" value={isVictory ? "Vitória" : "Derrota"} />
            <SummaryRow
              label="Motivo do encerramento"
              value={
                matchEndReason === "forfeit"
                  ? `Comandante ${loserLabel} não retornou a tempo (W.O.)`
                  : byPoints
                    ? "Limite de rodadas (pontos)"
                    : byTime
                      ? `Tempo esgotado (${loserLabel})`
                      : `Bandeira ${loserLabel} capturada`
              }
            />
            {points && <SummaryRow label="Pontos (Azul)" value={`${points.blue.total} (capturas ${points.blue.captured} + vivas ${points.blue.alive} + bandeira ${points.blue.flag})`} />}
            {points && <SummaryRow label="Pontos (Vermelho)" value={`${points.red.total} (capturas ${points.red.captured} + vivas ${points.red.alive} + bandeira ${points.red.flag})`} />}
            <SummaryRow label="Número de turnos" value={String(state.turnNumber)} />
            <SummaryRow label="Tempo da partida" value={formatClock(matchDurationMs)} />
            <SummaryRow label="Peças restantes (Azul)" value={String(piecesAlive("blue"))} />
            <SummaryRow label="Peças restantes (Vermelho)" value={String(piecesAlive("red"))} />
          </div>
        </ScifiFrame>

        {/* Sprint RANKING-01 — Fase 14. `rankingResult` só existe online
            (offline é sempre `null`, ver `useGameState.tsx`); quando
            existe, distingue "casual" (Rating não muda) de "ranked"
            (mostra o antes/depois/delta que o SERVIDOR calculou — nunca
            recalculado aqui). */}
        {rankingResult && (
          <ScifiFrame
            variant={isVictory ? "cyan" : "red"}
            eyebrow="// RATING"
            tabLabel={rankingResult.matchType === "ranked" ? "RESULTADO RANQUEADO" : "PARTIDA CASUAL"}
            className="mt-2 text-left [@media(min-height:480px)]:mt-4"
          >
            {rankingResult.matchType === "ranked" ? (
              <div className="flex items-center justify-between py-1">
                <span className="font-display text-sm font-bold text-foreground [@media(min-height:480px)]:text-lg">
                  {rankingResult.ratingBefore} → {rankingResult.ratingAfter}
                </span>
                <span
                  className={`font-display text-sm font-black [@media(min-height:480px)]:text-lg ${
                    rankingResult.ratingDelta >= 0 ? "text-cyan-300" : "text-rose-400"
                  }`}
                >
                  {rankingResult.ratingDelta >= 0 ? "+" : ""}
                  {rankingResult.ratingDelta}
                </span>
              </div>
            ) : (
              <div className="py-1 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-[0.1em] text-foreground [@media(min-height:480px)]:text-sm">
                  Partida Casual
                </p>
                <p className="mt-1 font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground [@media(min-height:480px)]:text-xs">
                  Seu Rating permaneceu inalterado.
                </p>
              </div>
            )}
          </ScifiFrame>
        )}

        <div className="mt-2 flex justify-center [@media(min-height:480px)]:mt-6">
          <GameButton variant="primary" size="sm" onClick={reset} className="[@media(min-height:480px)]:!px-6 [@media(min-height:480px)]:!py-2.5 [@media(min-height:480px)]:!text-xs">
            NOVA PARTIDA
          </GameButton>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-1.5 text-xs last:border-0">
      <span className="uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="font-bold uppercase tracking-[0.08em] text-game-text">{value}</span>
    </div>
  );
}
