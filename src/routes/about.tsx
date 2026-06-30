import { createFileRoute } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Shadow Command" }] }),
  component: AboutPage,
});

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
        <div
          className="border border-primary/30 bg-card/40 p-6"
          style={{
            clipPath:
              "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
          }}
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="text-primary">Shadow Command</span> is a modern
            turn-based strategy board game where every move matters. Command
            asymmetric forces across a 10×10 tactical grid in a near-future
            cyberpunk theatre.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {[
            ["VER", "0.1.0"],
            ["ENGINE", "SHADE"],
            ["REGION", "AURORA-7"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="border border-border/60 bg-card/40 px-3 py-2 text-center"
            >
              <div className="text-primary">{v}</div>
              <div>{k}</div>
            </div>
          ))}
        </div>

        <p className="text-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          © 2049 SHADOWNET INDUSTRIES // ALL OPERATIONS CLASSIFIED
        </p>
      </div>
    </ScreenShell>
  );
}
