import { createFileRoute } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GamePanel } from "@/components/ui/GamePanel";
import { GameCard } from "@/components/ui/GameCard";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Conflito" }] }),
  component: AboutPage,
});

const BUILD_INFO = [
  ["VER",    "0.1.0"],
  ["ENGINE", "CONFLITO"],
  ["STATUS", "ONLINE"],
] as const;

function AboutPage() {
  return (
    <ScreenShell
      eyebrow="// DOSSIER"
      title="About"
      subtitle="Conflito — Build 0.1.0-Alpha"
      backTo="/"
      backLabel="← Home"
    >
      <div className="mx-auto max-w-2xl space-y-6 text-left">
        <GamePanel variant="blue" eyebrow="// INTEL BRIEF">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="text-primary">Conflito</span> is a modern
            turn-based strategy board game where every move matters. Command
            asymmetric forces across a 10×10 tactical grid.
          </p>
        </GamePanel>

        {/* Build-info grid */}
        <div className="grid grid-cols-3 gap-3">
          {BUILD_INFO.map(([k, v]) => (
            <GameCard
              key={k}
              hoverable={false}
              header={
                <div className="text-center font-display text-xs font-bold text-primary pt-1">
                  {v}
                </div>
              }
            >
              <div className="text-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground pb-1">
                {k}
              </div>
            </GameCard>
          ))}
        </div>

        <p className="text-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          © 2026 SCHAUSTECK GAME STUDIO
        </p>
      </div>
    </ScreenShell>
  );
}
