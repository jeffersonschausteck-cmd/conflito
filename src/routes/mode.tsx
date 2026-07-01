import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
          <GameCard
            key={m.id}
            state={m.disabled ? "disabled" : "default"}
            hoverable={!m.disabled}
            onClick={() => onSelect(m)}
            style={{ cursor: m.disabled ? "not-allowed" : "pointer", textAlign: "left" }}
          >
            <div className="p-2">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-[10px] uppercase tracking-[0.4em] text-primary/80">
                  {m.tagline}
                </div>
                {m.disabled && (
                  <StatusBadge color="red" label="Locked" />
                )}
              </div>
              <h3 className="font-display text-2xl font-bold uppercase tracking-[0.1em] text-foreground">
                {m.name}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {m.description}
              </p>
              <div className="mt-6 font-display text-[10px] uppercase tracking-[0.3em]">
                {m.disabled ? (
                  <span className="text-destructive/70">⛔ Locked</span>
                ) : (
                  <StatusBadge color="green" label="▶ Select" />
                )}
              </div>
            </div>
          </GameCard>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link to="/">
          <GameButton variant="ghost" size="md">Cancel</GameButton>
        </Link>
      </div>
    </ScreenShell>
  );
}
