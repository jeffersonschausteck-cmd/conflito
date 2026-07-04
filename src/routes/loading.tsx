import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";

export const Route = createFileRoute("/loading")({
  head: () => ({
    meta: [{ title: "Inicializando — Conflito" }],
  }),
  component: LoadingPage,
});

const MESSAGES = [
  "// Estabelecendo canal seguro...",
  "// Identificando comandante...",
  "// Carregando mapa operacional...",
  "// Posicionando tropas...",
  "// Sincronizando inteligência tática...",
  "// Missão pronta...",
];

function LoadingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 3200;
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(() => navigate({ to: "/deployment" }), 300);
      }
    }, 60);
    return () => clearInterval(tick);
  }, [navigate]);

  useEffect(() => {
    const rot = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGES.length),
      650,
    );
    return () => clearInterval(rot);
  }, []);

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      <CyberBackground />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 px-6 text-center">
        <div className="font-display text-[10px] uppercase tracking-[0.5em] text-primary/80 animate-flicker">
          // CANAL SEGURO ESTABELECIDO
        </div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-[0.2em] text-foreground sm:text-3xl text-glow">
          Preparando Operação
        </h2>

        {/* Progress */}
        <div className="w-full">
          <div className="relative h-2 w-full overflow-hidden border border-primary/40 bg-primary/5">
            <div
              className="h-full transition-[width] duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, var(--primary), var(--primary-glow))",
                boxShadow: "0 0 20px var(--primary)",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span>SEQUÊNCIA DE INICIALIZAÇÃO</span>
            <span className="text-primary">{Math.floor(progress)}%</span>
          </div>
        </div>

        <div
          key={msgIndex}
          className="min-h-[1.5em] font-display text-sm uppercase tracking-[0.3em] text-primary animate-fade-in"
        >
          {MESSAGES[msgIndex]}
        </div>
      </div>
    </main>
  );
}
