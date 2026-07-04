import { CyberBackground } from "@/components/CyberBackground";
import { GameLogo } from "@/components/GameLogo";
import { StatusBar, StatusFooter } from "@/components/StatusBar";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from "@tanstack/react-router";

const STATS = [
  { badge: "12", label: "Facções", color: "blue" },
  { badge: "1v1", label: "Competitivo", color: "green" },
  { badge: "∞", label: "Estratégias", color: "yellow" },
];

export function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <CyberBackground />
      <StatusBar />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-12 px-6 py-24 text-center animate-fade-in">
        <GameLogo />

        <p className="max-w-2xl text-balance font-display text-base uppercase tracking-[0.3em] text-muted-foreground sm:text-lg">
          Um jogo moderno de estratégia
          <span className="mx-2 text-primary">//</span>
          onde cada decisão define a guerra.
        </p>

        {/* CTA buttons */}
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <Link to="/mode">
            <GameButton variant="primary" size="lg">▶ Jogar</GameButton>
          </Link>
          <Link to="/settings">
            <GameButton variant="secondary" size="md">⚙ Configurações</GameButton>
          </Link>
          <Link to="/about">
            <GameButton variant="ghost" size="md">◇ Créditos</GameButton>
          </Link>
        </div>

        {/* Stats grid */}
        <div className="mt-10 grid w-full max-w-md grid-cols-3 gap-3">
          {STATS.map((s) => (
            <GameCard
              key={s.label}
              hoverable={false}
              header={
                <StatusBadge color={s.color} label={s.badge} className="mx-auto" />
              }
            >
              <div className="pt-1 pb-2 text-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {s.label}
              </div>
            </GameCard>
          ))}
        </div>
      </div>

      <StatusFooter />
    </main>
  );
}
