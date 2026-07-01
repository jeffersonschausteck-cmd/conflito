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

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Operations Board — Shadow Command" },
      {
        name: "description",
        content: "10x10 tactical grid for Project Shadow Command.",
      },
    ],
  }),
  component: GamePage,
});

// ─── GamePage ────────────────────────────────────────────────────────────────

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
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <CyberBackground />

      {/* ── HUD Top ──────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between border-b border-primary/20 bg-background/40 px-6 py-3 backdrop-blur-md sm:px-10">
        {/* Operator info */}
        <div className="flex items-center gap-3" style={{ color: faction.color }}>
          <FactionIcon faction={faction.id} color={faction.color} size={28} />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Operator
            </div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
              {faction.name}
            </div>
          </div>
        </div>

        {/* Turn / Phase / Timer */}
        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Turn
            </div>
            <div className="font-display text-lg font-bold text-primary">
              {String(turn).padStart(2, "0")}
            </div>
          </div>
          <div className="h-8 w-px bg-primary/20" />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Phase
            </div>
            <StatusBadge color="blue" label="YOURS" />
          </div>
          <div className="h-8 w-px bg-primary/20" />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Timer
            </div>
            <div className="font-display text-lg font-bold tabular-nums text-primary text-glow">
              {mm}:{ss}
            </div>
          </div>
        </div>

        {/* Surrender link */}
        <GameTooltip content="Forfeit current match" position="bottom">
          <Link to="/result">
            <GameButton variant="danger" size="sm">⛔ Surrender</GameButton>
          </Link>
        </GameTooltip>
      </header>

      {/* ── Board + Sidebar ──────────────────────────────────────────────── */}
      <GameStateProvider>
        <RevealLogProvider>
          <TurnBanner />
          <section className="relative z-10 grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_320px] lg:px-8">
            <div className="flex flex-col items-center justify-center">
              <AIThinkingBanner />
              <BoardWithPieces />
            </div>
            <RevealLogPanel />
          </section>

          <SelectedUnitPanel />
          <GameOverOverlay />
        </RevealLogProvider>
      </GameStateProvider>
    </main>
  );
}

// ─── TurnBanner ──────────────────────────────────────────────────────────────

function TurnBanner() {
  const { state } = useGameState();
  const isBlue = state.currentPlayer === "BLUE";

  return (
    <div className="relative z-10 flex justify-center pt-4">
      <div key={state.turnNumber} className="turn-banner backdrop-blur-md">
        <StatusBadge
          color={isBlue ? "blue" : "red"}
          label={`${state.currentPlayer} TURN · #${String(state.turnNumber).padStart(2, "00")}`}
          icon={
            <span
              className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
              style={{
                background: isBlue ? theme.colors.primaryBlue : theme.colors.primaryRed,
                boxShadow: `0 0 8px currentColor`,
              }}
            />
          }
        />
      </div>
    </div>
  );
}

// ─── GameOverOverlay ─────────────────────────────────────────────────────────

function GameOverOverlay() {
  const { state, reset } = useGameState();
  if (!state.gameOver || !state.winner) return null;
  const isBlue = state.winner === "BLUE";

  return (
    <Modal
      isOpen={state.gameOver && !!state.winner}
      onClose={reset}
      title="Operation Concluded"
      footer={
        <GameButton variant="primary" size="md" onClick={reset}>
          New Engagement
        </GameButton>
      }
    >
      <div className="text-center py-4">
        <StatusBadge
          color={isBlue ? "blue" : "red"}
          label={`${state.winner} VICTORY`}
          className="mx-auto mb-4"
        />
        <div
          className="font-display text-4xl font-bold uppercase tracking-[0.25em]"
          style={{
            color: isBlue ? theme.colors.primaryBlue : theme.colors.primaryRed,
            textShadow: `0 0 30px ${isBlue ? theme.colors.primaryBlue : theme.colors.primaryRed}`,
          }}
        >
          {state.winner} VICTORY
        </div>
      </div>
    </Modal>
  );
}

// ─── AIThinkingBanner ────────────────────────────────────────────────────────

function AIThinkingBanner() {
  const { thinking, aiPlayer } = useAITurn();

  return (
    <div className="mb-4 h-8 flex items-center justify-center">
      {thinking && (
        <StatusBadge
          color="red"
          label={`${aiPlayer} · AI thinking`}
          icon={
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          }
        />
      )}
    </div>
  );
}

// ─── SelectedUnitPanel ───────────────────────────────────────────────────────

function SelectedUnitPanel() {
  const { selectedPiece, state } = useGameState();
  const label = selectedPiece
    ? `${selectedPiece.owner.toUpperCase()} · ${selectedPiece.pieceType.toUpperCase()}`
    : "No unit selected · Tap a piece to inspect";
  const glyph = selectedPiece ? selectedPiece.pieceType.charAt(0).toUpperCase() : "?";

  return (
    <footer className="relative z-10 mx-auto mb-6 mt-2 w-full max-w-3xl px-6">
      <GamePanel
        variant={selectedPiece ? "blue" : "default"}
        glow={!!selectedPiece}
      >
        <div className="flex items-center gap-4">
          {/* Piece glyph */}
          <div className="grid h-14 w-14 place-items-center border border-primary/40 bg-primary/5 font-display text-xl text-primary shrink-0">
            {glyph}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Selected Unit · Active {state.currentPlayer}
            </div>
            <div className="font-display text-sm uppercase tracking-[0.2em] text-foreground/70 truncate">
              {label}
            </div>
          </div>

          {/* Rank / Moves badges */}
          <div className="hidden gap-2 sm:flex">
            <StatusBadge
              color="blue"
              label={`Rank ${selectedPiece ? selectedPiece.rank : "—"}`}
            />
            <StatusBadge color="yellow" label="Moves —" />
          </div>
        </div>
      </GamePanel>
    </footer>
  );
}

// ─── RevealLogPanel ──────────────────────────────────────────────────────────

function RevealLogPanel() {
  const { log } = useRevealLog();

  return (
    <GamePanel
      variant="default"
      eyebrow="Intel"
      title="Reveal Log"
      className="lg:sticky lg:top-24 lg:self-start"
    >
      <div className="mb-2 flex justify-end">
        <StatusBadge
          color="blue"
          label={String(log.length).padStart(2, "0")}
        />
      </div>

      {log.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-3 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          No enemy units identified.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {log.map((entry) => {
            const isBlue = entry.owner === "blue";
            return (
              <li
                key={entry.id}
                className="flex items-center gap-2 border border-border/40 bg-background/40 px-2.5 py-1.5"
              >
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: isBlue ? theme.colors.primaryBlue : theme.colors.primaryRed,
                    boxShadow: `0 0 6px currentColor`,
                  }}
                />
                <StatusBadge
                  color={isBlue ? "blue" : "red"}
                  label={`${isBlue ? "Blue" : "Red"} revealed:`}
                />
                <span className="font-display text-[11px] uppercase tracking-[0.18em] text-foreground">
                  {entry.pieceType}
                </span>
                <span className="ml-auto font-display text-[10px] text-muted-foreground shrink-0">
                  R{entry.rank}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </GamePanel>
  );
}
