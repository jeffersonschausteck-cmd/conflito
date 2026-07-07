import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { BoardWithPieces } from "@/components/BoardWithPieces";
import { GameStateProvider, useGameState } from "@/hooks/useGameState";
import { RevealLogProvider } from "@/hooks/useRevealLog";
import { useAITurn } from "@/hooks/useAITurn";
import { GameButton } from "@/components/ui/GameButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScifiFrame } from "@/components/ui/ScifiFrame";
import { TopBar } from "@/components/game/TopBar";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { CommandCenter } from "@/components/game/CommandCenter";
import { MatchActionsBar } from "@/components/game/MatchActionsBar";
import { TerrainPanel } from "@/components/game/TerrainPanel";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import type { TerrainId } from "@/maps/types";
import { flowState } from "@/services/flowState";
import { OnlineGameStateProvider } from "@/multiplayer/OnlineGameStateProvider";
import { rehydrateGameState } from "@/multiplayer/NetworkClient";
import type { GameState } from "@/types/gameState";

/**
 * Componente estável (fora de GamePage) para o provedor de estado do
 * jogo. Antes era declarado inline no corpo de GamePage, o que criava
 * uma nova referência de função a cada render — o React interpretava
 * isso como um tipo de componente diferente e desmontava/remontava
 * toda a subárvore (inclusive o GameStateProvider e seu reducer) a
 * cada clique, perdendo a seleção de peça. Hoisted para o módulo para
 * que a mesma instância sobreviva durante toda a partida.
 */
function GameProvider({
  isOnline,
  onlineInitialState,
  children,
}: {
  isOnline: boolean;
  onlineInitialState: GameState | null;
  children: ReactNode;
}) {
  return isOnline && onlineInitialState ? (
    <OnlineGameStateProvider initialState={onlineInitialState}>{children}</OnlineGameStateProvider>
  ) : (
    <GameStateProvider
      config={{
        rows: ACTIVE_MAP.rows,
        cols: ACTIVE_MAP.cols,
        blockedTiles: getBlockedTiles(ACTIVE_MAP),
      }}
    >
      {children}
    </GameStateProvider>
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

  const onlineInitialState = useMemo<GameState | null>(() => {
    if (!isOnline || typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("conflito:online-state");
      return raw ? rehydrateGameState(JSON.parse(raw) as GameState) : null;
    } catch {
      return null;
    }
  }, [isOnline]);

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <CyberBackground />

      <GameProvider isOnline={isOnline} onlineInitialState={onlineInitialState}>
        <RevealLogProvider>
          {/* Grid de 2 linhas (TopBar/conteúdo) — sem faixa inferior, o
              tabuleiro ganha toda a altura restante. A linha de conteúdo
              (1fr) nunca cresce além do espaço real, então continua sem
              scroll em nenhuma resolução ou zoom. */}
          <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden">
            <TopBar />

            {/* LINHA PRINCIPAL — coluna Vermelho+Terreno / tabuleiro / coluna Azul+Peça */}
            <div className="flex min-h-0 items-stretch gap-4 overflow-hidden px-4 py-4">
              {/* COLUNA ESQUERDA — Jogador Vermelho + Reconhecimento de Terreno */}
              <div className="flex w-[260px] min-h-0 shrink-0 flex-col gap-4">
                <div className="min-h-0 flex-1">
                  <PlayerPanel owner="red" />
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
              <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3">
                <AIThinkingBanner />
                <div className="min-h-0 w-full flex-1">
                  <BoardWithPieces onTileClick={(row, col) => setSelectedCell({ row, col })} />
                </div>
                <MatchActionsBar />
              </div>

              {/* COLUNA DIREITA — Jogador Azul + Peça Selecionada */}
              <div className="flex w-[260px] min-h-0 shrink-0 flex-col gap-4">
                <div className="min-h-0 flex-1">
                  <PlayerPanel owner="blue" />
                </div>
                <div className="min-h-0 flex-1">
                  <CommandCenter />
                </div>
              </div>
            </div>
          </div>

          <GameOverOverlay />
        </RevealLogProvider>
      </GameProvider>
    </main>
  );
}

/* ========================================================================== */
/* IA */
/* ========================================================================== */

function AIThinkingBanner() {
  const { thinking, aiPlayer } = useAITurn();

  if (!thinking) return null;

  return (
    <div className="mb-3">
      <StatusBadge
        color="red"
        label={`IA (${aiPlayer}) analisando o campo de batalha...`}
        icon={<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />}
      />
    </div>
  );
}

/* ========================================================================== */
/* FIM DA PARTIDA */
/* ========================================================================== */

function GameOverOverlay() {
  const { state, reset } = useGameState();

  if (!state.gameOver) return null;

  // Perspectiva do jogador local (LOCAL_VIEWER = "blue" — services/fogOfWarEngine.ts).
  const isVictory = state.winner === "BLUE";
  const loserLabel = state.winner === "BLUE" ? "Vermelha" : "Azul";

  const piecesAlive = (owner: "blue" | "red") =>
    state.pieces.filter((p) => p.owner === owner && p.isAlive).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay escuro com leve blur — o campo de batalha permanece visível ao fundo. */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
        className="relative z-10 w-full max-w-md text-center"
      >
        <h2
          id="game-over-title"
          className={`font-display text-3xl font-bold uppercase tracking-[0.12em] ${
            isVictory ? "text-cyan-300" : "text-rose-400"
          }`}
        >
          {isVictory ? "MISSÃO CONCLUÍDA" : "MISSÃO FRACASSADA"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {isVictory
            ? "Sua ofensiva foi concluída com sucesso."
            : "O exército inimigo capturou sua Bandeira."}
        </p>

        <ScifiFrame
          variant={isVictory ? "cyan" : "red"}
          eyebrow="// RELATÓRIO"
          tabLabel="RESUMO DA PARTIDA"
          className="mt-6 text-left"
        >
          <div className="space-y-2">
            <SummaryRow label="Resultado" value={isVictory ? "Vitória" : "Derrota"} />
            <SummaryRow label="Motivo do encerramento" value={`Bandeira ${loserLabel} capturada`} />
            <SummaryRow label="Número de turnos" value={String(state.turnNumber)} />
            <SummaryRow label="Tempo da partida" value="—" />
            <SummaryRow label="Peças restantes (Azul)" value={String(piecesAlive("blue"))} />
            <SummaryRow label="Peças restantes (Vermelho)" value={String(piecesAlive("red"))} />
          </div>
        </ScifiFrame>

        <div className="mt-6 flex justify-center">
          <GameButton variant="primary" onClick={reset}>
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
