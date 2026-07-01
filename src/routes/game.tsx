import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { BoardWithPieces } from "@/components/BoardWithPieces";
import { FACTIONS, flowState } from "@/services/flowState";
import { FactionIcon } from "@/components/FactionIcon";
import { GameStateProvider, useGameState } from "@/hooks/useGameState";
import { RevealLogProvider, useRevealLog } from "@/hooks/useRevealLog";
import { useAITurn } from "@/hooks/useAITurn";

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

      {/* HUD top */}
      <header className="relative z-10 flex items-center justify-between border-b border-primary/20 bg-background/40 px-6 py-3 backdrop-blur-md sm:px-10">
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
            <div className="font-display text-lg font-bold text-foreground">
              YOURS
            </div>
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

        <div className="flex items-center gap-3">
          <Link
            to="/result"
            className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-destructive"
          >
            ⛔ Surrender
          </Link>
        </div>
      </header>

      {/* Board */}
      <GameStateProvider>
        <RevealLogProvider>
          <section className="relative z-10 grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_320px] lg:px-8">
            <div className="flex flex-col items-center justify-center">
              <BoardWithPieces />
            </div>
            <RevealLogPanel />
          </section>

          {/* Bottom panel: selected piece */}
          <SelectedUnitPanel />
        </RevealLogProvider>
      </GameStateProvider>
    </main>
  );
}

function SelectedUnitPanel() {
  const { selectedPiece, state } = useGameState();
  const label = selectedPiece
    ? `${selectedPiece.owner.toUpperCase()} · ${selectedPiece.pieceType.toUpperCase()}`
    : "No unit selected · Tap a piece to inspect";
  const glyph = selectedPiece ? selectedPiece.pieceType.charAt(0).toUpperCase() : "?";

  return (
    <footer className="relative z-10 mx-auto mb-6 mt-2 w-full max-w-3xl px-6">
      <div
        className="border border-primary/30 bg-card/50 p-4 backdrop-blur-md"
        style={{
          clipPath:
            "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center border border-primary/40 bg-primary/5 font-display text-xl text-primary">
            {glyph}
          </div>
          <div className="flex-1">
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Selected Unit · Active {state.currentPlayer}
            </div>
            <div className="font-display text-sm uppercase tracking-[0.2em] text-foreground/70">
              {label}
            </div>
          </div>
          <div className="hidden gap-2 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:flex">
            <span className="border border-border/60 px-2 py-1">
              RANK {selectedPiece ? selectedPiece.rank : "—"}
            </span>
            <span className="border border-border/60 px-2 py-1">MOVES —</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function RevealLogPanel() {
  const { log } = useRevealLog();

  return (
    <aside
      className="border border-primary/25 bg-card/40 p-4 backdrop-blur-md lg:sticky lg:top-24 lg:self-start"
      style={{
        clipPath:
          "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Intel · Reveal Log
        </div>
        <span className="font-display text-[10px] tabular-nums text-primary/70">
          {String(log.length).padStart(2, "0")}
        </span>
      </div>

      {log.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-3 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          No enemy units identified.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {log.map((entry) => {
            const isBlue = entry.owner === "blue";
            const color = isBlue ? "text-cyan-300" : "text-rose-300";
            const dot = isBlue ? "bg-cyan-400" : "bg-rose-400";
            return (
              <li
                key={entry.id}
                className="flex items-center gap-2 border border-border/40 bg-background/40 px-2.5 py-1.5"
              >
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 rounded-full ${dot} shadow-[0_0_8px_currentColor]`}
                />
                <span className={`font-display text-[11px] uppercase tracking-[0.18em] ${color}`}>
                  {entry.owner === "blue" ? "Blue" : "Red"} unit revealed:
                </span>
                <span className="font-display text-[11px] uppercase tracking-[0.18em] text-foreground">
                  {entry.pieceType}
                </span>
                <span className="ml-auto font-display text-[10px] text-muted-foreground">
                  R{entry.rank}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
