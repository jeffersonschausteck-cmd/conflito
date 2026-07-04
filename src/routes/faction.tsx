import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GameTooltip } from "@/components/ui/GameTooltip";
import { FactionIcon } from "@/components/FactionIcon";
import { FACTIONS, flowState, type FactionId } from "@/services/flowState";

export const Route = createFileRoute("/faction")({
  head: () => ({
    meta: [{ title: "Seleção de Facção — Conflito" }],
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
      eyebrow="// ETAPA 02 / 03"
      title="Escolha sua Facção"
      subtitle="Cada facção possui uma doutrina de combate. Escolha a sua."
      backTo="/mode"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FACTIONS.map((f) => {
          const isSelected = selected === f.id;
          return (
            <GameTooltip key={f.id} content={f.tagline} position="bottom">
              <GameCard
                state={isSelected ? "selected" : "default"}
                hoverable
                onClick={() => setSelected(f.id)}
                style={{ cursor: "pointer", color: f.color, boxShadow: isSelected ? `0 0 40px -8px ${f.glow}` : undefined }}
                header={
                  <div className="flex flex-col items-center gap-3 pt-2">
                    <FactionIcon faction={f.id} color={f.color} />
                  </div>
                }
                footer={
                  <div
                    className="h-px w-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`,
                      opacity: isSelected ? 1 : 0.3,
                    }}
                  />
                }
              >
                <div className="text-center py-2">
                  <div className="font-display text-lg font-bold uppercase tracking-[0.15em] text-foreground">
                    {f.name}
                  </div>
                  <div className="mt-1 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {f.tagline}
                  </div>
                </div>
              </GameCard>
            </GameTooltip>
          );
        })}
      </div>

      <div className="mt-12 flex justify-center gap-4">
        <GameButton
          variant={selected ? "primary" : "disabled"}
          size="lg"
          disabled={!selected}
          onClick={confirm}
        >
          Iniciar Missão ▶
        </GameButton>
      </div>
    </ScreenShell>
  );
}
