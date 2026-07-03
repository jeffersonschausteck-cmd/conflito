import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { BoardWithPieces } from "@/components/BoardWithPieces";
import { FACTIONS, flowState } from "@/services/flowState";
import { FactionIcon } from "@/components/FactionIcon";
import { GameStateProvider, useGameState } from "@/hooks/useGameState";
import { RevealLogProvider, useRevealLog } from "@/hooks/useRevealLog";
import { useAITurn } from "@/hooks/useAITurn";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { GameTooltip } from "@/components/ui/GameTooltip";
import { theme } from "@/design/theme";
import { RightSidebar } from "@/components/game/RightSidebar";
import { TacticalGuide } from "@/components/game/TacticalGuide";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Shadow Command — Campo de Batalha" },
      {
        name: "description",
        content: "Campo de batalha tático do Shadow Command.",
      },
    ],
  }),
  component: GamePage,
});

// ─────────────────────────────────────────────────────────────
// GAME PAGE
// ─────────────────────────────────────────────────────────────

function GamePage() {
  const [seconds, setSeconds] = useState(45);
  const [turn, setTurn] = useState(1);

  const flow = flowState.read();
  const faction = FACTIONS.find((f) => f.id === flow.faction) ?? FACTIONS[1];

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setTurn((n) => n + 1);
          return 45;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">

      <CyberBackground />

      {/* ======================== HUD SUPERIOR ======================== */}

      <header className="relative z-20 flex h-16 items-center justify-between border-b border-cyan-500/20 bg-slate-950/80 px-8 backdrop-blur-xl">

        {/* OPERADOR */}

        <div className="flex items-center gap-4">

          <FactionIcon
            faction={faction.id}
            color={faction.color}
            size={34}
          />

          <div>

            <div className="font-display text-[10px] uppercase tracking-[0.35em] text-slate-500">
              OPERADOR
            </div>

            <div className="font-display text-lg font-bold uppercase tracking-[0.18em] text-white">
              {faction.name}
            </div>

          </div>

        </div>

        {/* CENTRO */}

        <div className="flex items-center gap-10">

          <div className="text-center">

            <div className="font-display text-[10px] uppercase tracking-[0.35em] text-slate-500">
              TURNO
            </div>

            <div className="font-display text-2xl font-bold text-cyan-400">
              {String(turn).padStart(2, "0")}
            </div>

          </div>

          <div className="h-10 w-px bg-cyan-500/20" />

          <div className="text-center">

            <div className="font-display text-[10px] uppercase tracking-[0.35em] text-slate-500">
              FASE
            </div>

            <StatusBadge
              color="blue"
              label="EM COMBATE"
            />

          </div>

          <div className="h-10 w-px bg-cyan-500/20" />

          <div className="text-center">

            <div className="font-display text-[10px] uppercase tracking-[0.35em] text-slate-500">
              TEMPO
            </div>

            <div className="font-display text-xl font-bold text-cyan-400">
              {mm}:{ss}
            </div>

          </div>

        </div>

        {/* BOTÃO */}

        <GameTooltip
          content="Encerrar a missão"
          position="bottom"
        >

          <Link to="/result">

            <GameButton
              variant="danger"
              size="sm"
            >
              ENCERRAR MISSÃO
            </GameButton>

          </Link>

        </GameTooltip>

      </header>
      {/* ======================== ÁREA DO JOGO ======================== */}

      <GameStateProvider>
        <RevealLogProvider>

          <TurnBanner />

          <section className="relative z-10 flex h-[calc(100vh-64px)] gap-6 px-6 py-5 overflow-hidden">

            {/* GUIA */}

            <div className="w-[260px] shrink-0">

              <TacticalGuide />

            </div>

            {/* TABULEIRO */}

            <div className="flex flex-1 items-center justify-center">

              <div className="w-full max-w-[1180px]">

                <AIThinkingBanner />

                <BoardWithPieces />

              </div>

            </div>

            {/* PAINEL DIREITO */}

            <div className="w-[420px] shrink-0">

              <RightSidebar />

            </div>

          </section>

          <GameOverOverlay />

        </RevealLogProvider>
      </GameStateProvider>

    </main>
  );
}

/* ========================================================================== */
/* TURNO */
/* ========================================================================== */

function TurnBanner() {

  const { state } = useGameState();

  const isBlue = state.currentPlayer === "BLUE";

  return (

    <div className="relative z-20 flex justify-center py-3">

      <StatusBadge
        color={isBlue ? "blue" : "red"}
        label={`${isBlue ? "EQUIPE AZUL" : "EQUIPE VERMELHA"} • TURNO ${state.turnNumber}`}
        className="px-6 py-1 shadow-[0_0_18px_rgba(0,200,255,0.25)]"
      />

    </div>

  );

}

/* ========================================================================== */
/* IA */
/* ========================================================================== */

function AIThinkingBanner() {

  const { thinking, aiPlayer } = useAITurn();

  if (!thinking) return null;

  return (

    <div className="mb-5">

      <StatusBadge
        color="red"
        label={`IA (${aiPlayer}) analisando o campo de batalha...`}
        icon={
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
        }
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

    <Modal

      isOpen

      onClose={reset}

      title="MISSÃO ENCERRADA"

    >

      <div className="space-y-6 text-center">

        <div className="text-lg text-slate-300">

          A operação foi concluída.

        </div>

        <GameButton
          variant="primary"
          onClick={reset}
        >

          NOVA PARTIDA

        </GameButton>

      </div>

    </Modal>

  );

}