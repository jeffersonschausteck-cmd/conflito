import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { BoardWithPieces } from "@/components/BoardWithPieces";
import { FACTIONS, flowState } from "@/services/flowState";
import { FactionIcon } from "@/components/FactionIcon";

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
      <section className="relative z-10 flex flex-col items-center justify-center px-4 py-8">
        <BoardWithPieces />
      </section>

      {/* Bottom panel: selected piece */}
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
              ?
            </div>
            <div className="flex-1">
              <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Selected Unit
              </div>
              <div className="font-display text-sm uppercase tracking-[0.2em] text-foreground/70">
                No unit selected · Tap a piece to inspect
              </div>
            </div>
            <div className="hidden gap-2 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:flex">
              <span className="border border-border/60 px-2 py-1">RANK —</span>
              <span className="border border-border/60 px-2 py-1">MOVES —</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
