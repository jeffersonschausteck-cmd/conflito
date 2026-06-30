import { CyberBackground } from "@/components/CyberBackground";
import { CyberButton } from "@/components/CyberButton";
import { GameLogo } from "@/components/GameLogo";
import { StatusBar, StatusFooter } from "@/components/StatusBar";
import { Link } from "@tanstack/react-router";

export function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <CyberBackground />
      <StatusBar />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-12 px-6 py-24 text-center animate-fade-in">
        <GameLogo />

        <p className="max-w-2xl text-balance font-display text-base uppercase tracking-[0.3em] text-muted-foreground sm:text-lg">
          A modern strategy board game
          <span className="mx-2 text-primary">//</span>
          where every move matters.
        </p>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <Link to="/mode">
            <CyberButton variant="primary">▶ New Game</CyberButton>
          </Link>
          <Link to="/settings">
            <CyberButton variant="secondary">⚙ Settings</CyberButton>
          </Link>
          <Link to="/about">
            <CyberButton variant="ghost">◇ About</CyberButton>
          </Link>
        </div>

        <div className="mt-10 grid w-full max-w-md grid-cols-3 gap-3 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          <div className="border border-border/60 bg-card/40 px-3 py-2 backdrop-blur-sm">
            <div className="text-primary">12</div>
            <div>Factions</div>
          </div>
          <div className="border border-border/60 bg-card/40 px-3 py-2 backdrop-blur-sm">
            <div className="text-primary">1v1</div>
            <div>Ranked</div>
          </div>
          <div className="border border-border/60 bg-card/40 px-3 py-2 backdrop-blur-sm">
            <div className="text-primary">∞</div>
            <div>Strategies</div>
          </div>
        </div>
      </div>

      <StatusFooter />
    </main>
  );
}
