import { createFileRoute, Link } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GameCard } from "@/components/ui/GameCard";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [{ title: "Resultado da Missão — Conflito" }],
  }),
  component: ResultPage,
});

function ResultPage() {
  const result =
    typeof window !== "undefined"
      ? JSON.parse(
        window.sessionStorage.getItem("conflict:lastResult") ?? "{}"
      )
      : {};

  const isWin = result.winner === "BLUE";

  const stats = [
    { label: "Turnos", value: String(result.turn ?? "--") },
  ];

  return (
    <ScreenShell backTo="/" backLabel="← Início">
      <div className="flex flex-col items-center gap-8">
        {/* Mission complete label */}
        <div className="font-display text-[10px] uppercase tracking-[0.5em] text-primary/80">
          // MISSÃO CONCLUÍDA
        </div>

        {/* Victory / Defeat headline */}
        <div className="flex flex-col items-center gap-3">
          <StatusBadge
            color={isWin ? "green" : "red"}
            label={isWin ? "Vitória" : "Derrota"}
            className="text-lg px-4 py-1"
          />
          <h1
            className="font-display text-6xl font-black uppercase tracking-[0.25em] sm:text-8xl"
            style={{
              color: isWin ? "var(--primary)" : "var(--destructive)",
              textShadow: `0 0 40px ${isWin
                ? "color-mix(in oklab, var(--primary) 60%, transparent)"
                : "color-mix(in oklab, var(--destructive) 60%, transparent)"
                }`,
            }}
          >
            {isWin ? "VITÓRIA: Sua estratégia foi bem-sucedida. O objetivo da missão foi concluído com êxito." : "DERROTA: As forças inimigas dominaram o campo de batalha. Reorganize sua estratégia e tente novamente"}
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
            <GameButton variant="primary" size="lg">▶ Nova Partida</GameButton>
          </Link>
          <Link to="/">
            <GameButton variant="secondary" size="md">Menu Principal</GameButton>
          </Link>

        </div>
      </div>
    </ScreenShell>
  );
}
