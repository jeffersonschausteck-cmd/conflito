import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GameCard } from "@/components/ui/GameCard";

type Outcome = "victory" | "defeat";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [{ title: "Mission Result — Shadow Command" }],
  }),
  component: ResultPage,
});

function ResultPage() {
  const [outcome, setOutcome] = useState<Outcome>("victory");
  const isWin = outcome === "victory";

  const stats = [
    { label: "Turns",     value: "24" },
    { label: "Units Lost", value: "07" },
    { label: "Captures",  value: "12" },
    { label: "Accuracy",  value: "78%" },
  ];

  return (
    <ScreenShell backTo="/" backLabel="← Home">
      <div className="flex flex-col items-center gap-8">
        {/* Mission complete label */}
        <div className="font-display text-[10px] uppercase tracking-[0.5em] text-primary/80">
          // MISSION COMPLETE
        </div>

        {/* Victory / Defeat headline */}
        <div className="flex flex-col items-center gap-3">
          <StatusBadge
            color={isWin ? "green" : "red"}
            label={isWin ? "Victory" : "Defeat"}
            className="text-lg px-4 py-1"
          />
          <h1
            className="font-display text-6xl font-black uppercase tracking-[0.25em] sm:text-8xl"
            style={{
              color: isWin ? "var(--primary)" : "var(--destructive)",
              textShadow: `0 0 40px ${
                isWin
                  ? "color-mix(in oklab, var(--primary) 60%, transparent)"
                  : "color-mix(in oklab, var(--destructive) 60%, transparent)"
              }`,
            }}
          >
            {isWin ? "Victory" : "Defeat"}
          </h1>
        </div>

        {/* Stats grid */}
        <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <GamePanel
              key={s.label}
              variant={isWin ? "blue" : "red"}
              className="text-center"
            >
              <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-primary">
                {s.value}
              </div>
            </GamePanel>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row">
          <Link to="/mode">
            <GameButton variant="primary" size="lg">▶ Play Again</GameButton>
          </Link>
          <Link to="/">
            <GameButton variant="secondary" size="md">Home</GameButton>
          </Link>
          <GameButton
            variant="ghost"
            size="md"
            onClick={() => setOutcome(isWin ? "defeat" : "victory")}
          >
            Toggle Preview
          </GameButton>
        </div>
      </div>
    </ScreenShell>
  );
}
