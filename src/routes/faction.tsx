import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { CyberButton } from "@/components/CyberButton";
import { FactionIcon } from "@/components/FactionIcon";
import { FACTIONS, flowState, type FactionId } from "@/services/flowState";

export const Route = createFileRoute("/faction")({
  head: () => ({
    meta: [{ title: "Faction Select — Shadow Command" }],
  }),
  component: FactionSelectPage,
});

function FactionSelectPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<FactionId | null>(null);

  const confirm = () => {
    if (!selected) return;
    flowState.write({ faction: selected });
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("psc:initial-pieces");
    }
    navigate({ to: "/loading" });
  };

  return (
    <ScreenShell
      eyebrow="// STEP 02 / 03"
      title="Select Faction"
      subtitle="Each cell has a doctrine. Pick yours."
      backTo="/mode"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FACTIONS.map((f) => {
          const active = selected === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f.id)}
              className={`group relative flex flex-col items-center gap-4 border bg-card/40 p-6 text-center transition-all duration-300 ${
                active
                  ? "-translate-y-1 border-current"
                  : "border-border/60 hover:-translate-y-1 hover:border-current"
              }`}
              style={{
                color: f.color,
                boxShadow: active ? `0 0 40px -8px ${f.glow}` : undefined,
                clipPath:
                  "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
              }}
            >
              <FactionIcon faction={f.id} color={f.color} />
              <div>
                <div className="font-display text-lg font-bold uppercase tracking-[0.15em] text-foreground">
                  {f.name}
                </div>
                <div className="mt-1 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {f.tagline}
                </div>
              </div>
              <div
                className="absolute inset-x-4 bottom-2 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`,
                  opacity: active ? 1 : 0.3,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-12 flex justify-center gap-4">
        <CyberButton
          variant="primary"
          disabled={!selected}
          onClick={confirm}
        >
          Deploy ▶
        </CyberButton>
      </div>
    </ScreenShell>
  );
}
