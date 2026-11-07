import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Settings } from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { useElapsed } from "@/hooks/useClock";
import { formatClock } from "@/lib/formatClock";
import { GameButton } from "@/components/ui/GameButton";
import { GameTooltip } from "@/components/ui/GameTooltip";
import { InfoDrawer } from "@/components/game/InfoDrawer";

/**
 * Barra superior da partida — logo, placar (peças vivas de cada lado),
 * turno atual, cronômetro da Partida e utilitários. Todo dado vem de
 * `useGameState()`.
 */
export function TopBar() {
  const { state, matchStartTime, matchEndTime, matchType } = useGameState();
  const [infoOpen, setInfoOpen] = useState(false);
  // Sprint TIMER-01 — para de contar sozinho quando `matchEndTime` é
  // definido (fim de partida); até lá, incrementa a cada 250ms.
  const matchElapsedMs = useElapsed(matchStartTime, matchEndTime);

  const blueAlive = state.pieces.filter((p) => p.owner === "blue" && p.isAlive).length;
  const redAlive = state.pieces.filter((p) => p.owner === "red" && p.isAlive).length;
  const isBlueTurn = state.currentPlayer === "BLUE";

  return (
    <>
      {/* Sprint MOBILE-01 — altura e espaçamentos reduzidos (era `h-16
          px-6`, com placar em `gap-6` e blocos de texto grandes): numa
          tela de celular na horizontal essa combinação estourava a
          largura disponível e cortava o botão "Encerrar Missão" do lado
          direito. Textos/ões secundários (tagline, modo) só aparecem
          quando sobra altura real; nada aqui força largura mínima maior
          que o necessário. */}
      <header className="relative z-20 flex h-9 shrink-0 items-center justify-between gap-2 border-b border-cyan-500/20 bg-slate-950/80 px-2.5 backdrop-blur-xl [@media(min-height:480px)]:h-16 [@media(min-height:480px)]:px-6">
        {/* LOGO */}
        <div className="flex min-w-0 shrink-0 flex-col leading-none">
          <span className="font-display text-xs font-black uppercase tracking-[0.15em] text-white [@media(min-height:480px)]:text-lg [@media(min-height:480px)]:tracking-[0.2em]">
            Conflito
          </span>
          <span className="hidden font-display text-[9px] uppercase tracking-[0.3em] text-cyan-500/70 [@media(min-height:480px)]:block">
            Estratégia • Tática • Domínio
          </span>
          {/* Sprint RANKING-03 — Fase 6: mesma linha do subtítulo, sem
              espaço novo no layout — só mostra o modo discretamente. */}
          <span
            className={`hidden font-display text-[8px] font-bold uppercase tracking-[0.25em] [@media(min-height:480px)]:block ${
              matchType === "ranked" ? "text-amber-400/80" : "text-slate-500"
            }`}
          >
            {matchType === "ranked" ? "Ranqueada" : "Casual"}
          </span>
        </div>

        {/* PLACAR */}
        <div className="flex min-w-0 items-center gap-1.5 [@media(min-height:480px)]:gap-6">
          <TeamScore label="Azul" color="cyan" count={blueAlive} active={isBlueTurn} />
          <div className="text-center">
            <div className="hidden font-display text-[9px] uppercase tracking-[0.35em] text-slate-500 [@media(min-height:480px)]:block">
              Tempo
            </div>
            <div className="font-display text-xs font-bold tabular-nums text-cyan-300 [@media(min-height:480px)]:text-xl">
              {formatClock(matchElapsedMs)}
            </div>
          </div>
          <div className="text-center">
            <div className="hidden font-display text-[9px] uppercase tracking-[0.35em] text-slate-500 [@media(min-height:480px)]:block">
              Turno
            </div>
            <div className="font-display text-xs font-bold text-white [@media(min-height:480px)]:text-xl">
              {state.turnNumber}
            </div>
          </div>
          <TeamScore label="Vermelho" color="rose" count={redAlive} active={!isBlueTurn} reverse />
        </div>

        {/* UTILITÁRIOS */}
        <div className="flex shrink-0 items-center gap-1 [@media(min-height:480px)]:gap-2">
          <GameTooltip content="Guia tático e registro de inteligência" position="bottom">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Abrir informações"
              className="flex h-7 w-7 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 [@media(min-height:480px)]:h-9 [@media(min-height:480px)]:w-9"
            >
              <BookOpen size={14} />
            </button>
          </GameTooltip>

          <GameTooltip content="Configurações (em breve durante a partida)" position="bottom">
            <span className="hidden h-9 w-9 items-center justify-center rounded border border-slate-700 text-slate-500 [@media(min-height:480px)]:flex">
              <Settings size={16} />
            </span>
          </GameTooltip>

          <GameTooltip content="Render-se" position="bottom">
            <Link to="/result">
              <GameButton variant="danger" size="sm" className="!px-2 !text-[9px] [@media(min-height:480px)]:!px-3 [@media(min-height:480px)]:!text-[10px]">
                Sair
              </GameButton>
            </Link>
          </GameTooltip>
        </div>
      </header>

      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}

function TeamScore({
  label,
  color,
  count,
  active,
  reverse = false,
}: {
  label: string;
  color: "cyan" | "rose";
  count: number;
  active: boolean;
  reverse?: boolean;
}) {
  const textColor = color === "cyan" ? "text-cyan-300" : "text-rose-300";
  const borderColor = color === "cyan" ? "border-cyan-500/40" : "border-rose-500/40";
  const bgColor = color === "cyan" ? "bg-cyan-500/10" : "bg-rose-500/10";

  return (
    <div
      className={`flex items-center gap-3 rounded border px-3 py-1.5 ${borderColor} ${bgColor} ${reverse ? "flex-row-reverse" : ""} ${active ? "opacity-100" : "opacity-50"}`}
    >
      <span className={`font-display text-xs font-bold uppercase tracking-[0.2em] ${textColor}`}>
        {label}
      </span>
      <span className={`font-display text-lg font-black ${textColor}`}>{count}</span>
    </div>
  );
}
