import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { CyberButton } from "@/components/CyberButton";
import { flowState, type GameMode } from "@/services/flowState";

export const Route = createFileRoute("/mode")({
  head: () => ({
    meta: [{ title: "Mode Select — Shadow Command" }],
  }),
  component: ModeSelectPage,
});

interface ModeCard {
  id: GameMode;
  name: string;
  tagline: string;
  description: string;
  disabled?: boolean;
}

const MODES: ModeCard[] = [
  {
    id: "classic",
    name: "Classic Mode",
    tagline: "Standard 10×10 doctrine",
    description:
      "The original ruleset. Fog of war, hidden ranks, and asymmetric reveals.",
  },
  {
    id: "modern",
    name: "Modern Mode",
    tagline: "Augmented tactics // Coming Soon",
    description:
      "Adaptive abilities, cyber warfare layers, and dynamic terrain. Locked.",
    disabled: true,
  },
];

function ModeSelectPage() {
  const navigate = useNavigate();

  const onSelect = (mode: ModeCard) => {
    if (mode.disabled) return;
    flowState.write({ mode: mode.id });
    navigate({ to: "/faction" });
  };

  return (
    <ScreenShell
      eyebrow="// STEP 01 / 03"
      title="Select Mode"
      subtitle="Choose your operational doctrine."
      backTo="/"
      backLabel="← Home"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={m.disabled}
            onClick={() => onSelect(m)}
            className={`group relative overflow-hidden border p-8 text-left transition-all duration-300 ${
              m.disabled
                ? "cursor-not-allowed border-border/40 bg-card/20 opacity-50"
                : "border-primary/40 bg-card/40 hover:-translate-y-1 hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_40px_-10px_var(--primary)]"
            }`}
            style={{
              clipPath:
                "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
            }}
          >
            <div className="font-display text-[10px] uppercase tracking-[0.4em] text-primary/80">
              {m.tagline}
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.1em] text-foreground">
              {m.name}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {m.description}
            </p>
            <div className="mt-6 font-display text-[10px] uppercase tracking-[0.3em]">
              {m.disabled ? (
                <span className="text-destructive/70">⛔ Locked</span>
              ) : (
                <span className="text-primary">▶ Select →</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link to="/">
          <CyberButton variant="ghost">Cancel</CyberButton>
        </Link>
      </div>
    </ScreenShell>
  );
}
