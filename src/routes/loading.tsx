import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

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
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden text-foreground">
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 px-6 text-center">
        <div className="font-display text-[10px] uppercase tracking-[0.5em] text-sky-100 [text-shadow:0_1px_2px_#000] animate-flicker">
          // CANAL SEGURO ESTABELECIDO
        </div>
        <div className="relative inline-block px-8">
          <span className="absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2 bg-gradient-to-r from-rose-700 via-slate-900 to-sky-700 opacity-90 [clip-path:polygon(0_0,100%_0,97%_50%,100%_100%,0_100%,3%_50%)]" />
          <h2 className="relative font-display text-2xl font-black uppercase tracking-[0.14em] text-white [-webkit-text-stroke:1px_rgba(10,20,40,0.7)] [text-shadow:0_0_14px_rgba(0,0,0,0.6),0_3px_0_rgba(0,0,0,0.55)] sm:text-4xl">
            Preparando Operação
          </h2>
        </div>

        {/* Progress */}
        <div className="w-full">
          <div className="relative h-3 w-full overflow-hidden rounded-sm border-2 border-cyan-400/60 bg-slate-950/70">
            <div
              className="h-full transition-[width] duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #f59e0b, #fcd34d)",
                boxShadow: "0 0 18px rgba(251,191,36,0.7)",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between font-display text-[10px] uppercase tracking-[0.3em] text-sky-50 [text-shadow:0_1px_2px_#000]">
            <span>SEQUÊNCIA DE INICIALIZAÇÃO</span>
            <span className="text-amber-300">{Math.floor(progress)}%</span>
          </div>
        </div>

        <div
          key={msgIndex}
          className="min-h-[1.5em] font-display text-sm uppercase tracking-[0.3em] text-amber-200 [text-shadow:0_1px_3px_#000] animate-fade-in"
        >
          {MESSAGES[msgIndex]}
        </div>
      </div>
    </main>
  );
}
