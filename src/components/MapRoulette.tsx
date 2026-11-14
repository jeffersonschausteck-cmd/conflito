import { useEffect, useMemo, useRef, useState } from "react";
import { THEMES, type MapDefinition } from "@/maps";
import { MapPreview } from "@/components/MapPreview";

/**
 * Roleta de mapas (docs/08-Interface.md, "Roleta e Escolha do Mapa"): uma faixa com os mapas do modo que gira,
 * desacelera e para no mapa sorteado. O jogador não decide nada. `rand` é injetável para teste.
 */
const CARD = 176;
const GAP = 14;
const STEP = CARD + GAP;
const LAPS = 6;
const SPIN_MS = 4600;

export function MapRoulette({ maps, title, onDone, rand = Math.random }: { maps: MapDefinition[]; title: string; onDone: (map: MapDefinition) => void; rand?: () => number }) {
  const winner = useMemo(() => Math.min(maps.length - 1, Math.floor(rand() * maps.length)), [maps, rand]);
  // Onde o marcador cai dentro do cartão vencedor (um pouco fora do centro, como numa roleta de verdade).
  const jitter = useMemo(() => Math.round((rand() - 0.5) * (CARD * 0.5)), [rand]);
  const items = useMemo(() => Array.from({ length: maps.length * (LAPS + 2) }, (_, i) => maps[i % maps.length]), [maps]);
  const target = maps.length * LAPS + winner;
  const viewport = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"parado" | "girando" | "fim">("parado");
  const [vw, setVw] = useState(800);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    window.setTimeout(() => onDone(maps[winner]), 1500);
  };

  useEffect(() => {
    setVw(viewport.current?.offsetWidth ?? 800);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("fim");
      finish();
      return;
    }
    // Dois quadros de espera: o navegador precisa ver a posição inicial antes de animar até a final.
    let a = 0;
    let b = 0;
    a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setPhase("girando"));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = vw / 2 - CARD / 2;
  const end = vw / 2 - CARD / 2 - target * STEP - jitter;
  const x = phase === "parado" ? start : end;
  const picked = maps[winner];
  const theme = THEMES[picked.theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 px-3 backdrop-blur-sm" role="dialog" aria-label="Sorteio do mapa">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <div className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-amber-200/80 sm:text-xs">{title}</div>
          <h2 className="mt-1 font-display text-[clamp(1.4rem,3.4vw,2.2rem)] font-black uppercase leading-none tracking-[0.08em] text-amber-100 [text-shadow:0_0_14px_rgba(251,191,36,0.55),0_2px_0_rgba(0,0,0,0.65)]">
            {phase === "fim" ? "Mapa sorteado" : "Sorteando o mapa…"}
          </h2>
        </div>

        <div ref={viewport} className="relative mt-5 overflow-hidden rounded-xl border border-amber-300/40 bg-slate-900/70 py-5 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
          <div
            className="flex will-change-transform"
            style={{
              gap: GAP,
              transform: `translateX(${x}px)`,
              transition: phase === "girando" ? `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.7, 0.1, 1)` : "none",
            }}
            onTransitionEnd={() => {
              setPhase("fim");
              finish();
            }}
          >
            {items.map((m, i) => {
              const win = phase === "fim" && i === target;
              const t = THEMES[m.theme];
              return (
                <div
                  key={i}
                  className="shrink-0 rounded-lg border-2 p-2 text-center transition-all duration-500"
                  style={{
                    width: CARD,
                    borderColor: win ? t.destaque : "rgba(255,255,255,0.12)",
                    background: win ? "rgba(251,191,36,0.12)" : "rgba(15,23,42,0.7)",
                    transform: win ? "scale(1.07)" : "scale(1)",
                    opacity: phase === "fim" && !win ? 0.45 : 1,
                    boxShadow: win ? `0 0 26px ${t.destaque}88` : "none",
                  }}
                >
                  <MapPreview map={m} className="h-[92px] w-full" />
                  <div className="mt-2 font-display text-[12px] font-bold uppercase leading-tight tracking-[0.08em] text-white">{m.nome}</div>
                </div>
              );
            })}
          </div>
          {/* Marcador do centro */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-amber-300 via-amber-200 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[12px] border-x-transparent border-t-amber-300" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-b-[12px] border-x-transparent border-b-amber-300" />
        </div>

        <div className="mt-4 min-h-[3.5rem] text-center">
          {phase === "fim" ? (
            <>
              <div className="font-display text-lg font-black uppercase tracking-[0.1em]" style={{ color: theme.destaque }}>
                {picked.nome}
              </div>
              <p className="mx-auto mt-1 max-w-xl text-sm text-slate-200">{theme.descricao}</p>
            </>
          ) : (
            <button
              type="button"
              className="font-display text-[11px] uppercase tracking-[0.25em] text-slate-400 hover:text-slate-200"
              onClick={() => {
                setPhase("fim");
                finish();
              }}
            >
              Pular
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
