import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { CyberButton } from "@/components/CyberButton";

type Outcome = "victory" | "defeat";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [{ title: "Mission Result — Shadow Command" }],
  }),
  component: ResultPage,
});

function ResultPage() {
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome>("victory");
  const isWin = outcome === "victory";

  const stats = [
    { label: "Turns", value: "24" },
    { label: "Units Lost", value: "07" },
    { label: "Captures", value: "12" },
    { label: "Accuracy", value: "78%" },
  ];

  return (
    <ScreenShell backTo="/" backLabel="← Home">
      <div className="flex flex-col items-center gap-8">
        <div
          className="font-display text-[10px] uppercase tracking-[0.5em]"
          style={{ color: isWin ? "var(--primary)" : "var(--destructive)" }}
        >
          // MISSION COMPLETE
        </div>

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

        <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border border-primary/30 bg-card/40 p-4 text-center"
              style={{
                clipPath:
                  "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
              }}
            >
              <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-primary">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row">
          <Link to="/mode">
            <CyberButton variant="primary">▶ Play Again</CyberButton>
          </Link>
          <Link to="/">
            <CyberButton variant="secondary">Home</CyberButton>
          </Link>
          <CyberButton
            variant="ghost"
            onClick={() => setOutcome(isWin ? "defeat" : "victory")}
          >
            Toggle Preview
          </CyberButton>
        </div>
      </div>
    </ScreenShell>
  );
}
