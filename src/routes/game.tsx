import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { BoardWithPieces } from "@/components/BoardWithPieces";
import { GameStateProvider, useGameState } from "@/hooks/useGameState";
import { RevealLogProvider } from "@/hooks/useRevealLog";
import { useAITurn } from "@/hooks/useAITurn";
import { GameButton } from "@/components/ui/GameButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { TopBar } from "@/components/game/TopBar";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { CommandCenter } from "@/components/game/CommandCenter";
import { MatchActionsBar } from "@/components/game/MatchActionsBar";
import { MatchFooter } from "@/components/game/MatchFooter";
import { TerrainPanel } from "@/components/game/TerrainPanel";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import type { TerrainId } from "@/maps/types";
import { flowState } from "@/services/flowState";
import { OnlineGameStateProvider } from "@/multiplayer/OnlineGameStateProvider";
import type { GameState } from "@/types/gameState";

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
      return raw ? (JSON.parse(raw) as GameState) : null;
    } catch {
      return null;
    }
  }, [isOnline]);

  const Provider = ({ children }: { children: ReactNode }) =>
    isOnline && onlineInitialState ? (
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

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <CyberBackground />

      <Provider>
        <RevealLogProvider>
          {/* Grid de 3 linhas (TopBar/conteúdo/rodapé) — a linha do meio
              (1fr) recebe exatamente o espaço restante, nunca mais nem
              menos, então o tabuleiro nunca é empurrado para debaixo do
              rodapé em nenhuma resolução ou zoom. */}
          <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] overflow-hidden">
            <TopBar />

            {/* LINHA PRINCIPAL — painéis de jogador + tabuleiro */}
            <div className="flex min-h-0 items-stretch gap-4 overflow-hidden px-4 py-4">
              <div className="w-[260px] shrink-0">
                <PlayerPanel owner="blue" />
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
                <AIThinkingBanner />
                <div className="min-h-0 w-full max-w-[1400px] flex-1">
                  <BoardWithPieces onTileClick={(row, col) => setSelectedCell({ row, col })} />
                </div>
              </div>

              <div className="w-[260px] shrink-0">
                <PlayerPanel owner="red" />
              </div>
            </div>

            {/* FAIXA INFERIOR */}
            <MatchFooter>
              <CommandCenter />
              <MatchActionsBar />
              <TerrainPanel
                terrain={
                  selectedCell
                    ? (ACTIVE_MAP.tiles[selectedCell.row]?.[selectedCell.col] as TerrainId) ?? null
                    : null
                }
                row={selectedCell?.row}
                col={selectedCell?.col}
              />
            </MatchFooter>
          </div>

          <GameOverOverlay />
        </RevealLogProvider>
      </Provider>
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

  return (
    <Modal isOpen onClose={reset} title="MISSÃO ENCERRADA">
      <div className="space-y-6 text-center">
        <div className="text-lg text-slate-300">A operação foi concluída.</div>
        <GameButton variant="primary" onClick={reset}>
          NOVA PARTIDA
        </GameButton>
      </div>
    </Modal>
  );
}
