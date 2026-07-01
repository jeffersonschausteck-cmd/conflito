import { createFileRoute } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GamePanel } from "@/components/ui/GamePanel";
import { GameCard } from "@/components/ui/GameCard";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Shadow Command" }] }),
  component: AboutPage,
});

const BUILD_INFO = [
  ["VER",    "0.1.0"],
  ["ENGINE", "SHADE"],
  ["REGION", "AURORA-7"],
] as const;

function AboutPage() {
  return (
    <ScreenShell
      eyebrow="// DOSSIER"
      title="About"
      subtitle="Project Shadow Command — Build 0.1.0-Alpha"
      backTo="/"
      backLabel="← Home"
    >
      <div className="mx-auto max-w-2xl space-y-6 text-left">
        <GamePanel variant="blue" eyebrow="// INTEL BRIEF">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="text-primary">Shadow Command</span> is a modern
            turn-based strategy board game where every move matters. Command
            asymmetric forces across a 10×10 tactical grid in a near-future
            cyberpunk theatre.
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
          © 2049 SHADOWNET INDUSTRIES // ALL OPERATIONS CLASSIFIED
        </p>
      </div>
    </ScreenShell>
  );
}
