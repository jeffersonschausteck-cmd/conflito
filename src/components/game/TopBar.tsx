import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Settings } from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { GameButton } from "@/components/ui/GameButton";
import { GameTooltip } from "@/components/ui/GameTooltip";
import { InfoDrawer } from "@/components/game/InfoDrawer";

/**
 * Barra superior da partida — logo, placar (peças vivas de cada lado),
 * turno atual e utilitários. Todo dado vem de `useGameState()`; nada
 * aqui é decorativo/inventado (sem cronômetro, sem "fase" fictícia).
 */
export function TopBar() {
  const { state } = useGameState();
  const [infoOpen, setInfoOpen] = useState(false);

  const blueAlive = state.pieces.filter((p) => p.owner === "blue" && p.isAlive).length;
  const redAlive = state.pieces.filter((p) => p.owner === "red" && p.isAlive).length;
  const isBlueTurn = state.currentPlayer === "BLUE";

  return (
    <>
      <header className="relative z-20 flex h-16 items-center justify-between border-b border-cyan-500/20 bg-slate-950/80 px-6 backdrop-blur-xl">
        {/* LOGO */}
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-black uppercase tracking-[0.2em] text-white">
            Conflito
          </span>
          <span className="font-display text-[9px] uppercase tracking-[0.3em] text-cyan-500/70">
            Estratégia • Tática • Domínio
          </span>
        </div>

        {/* PLACAR */}
        <div className="flex items-center gap-6">
          <TeamScore label="Azul" color="cyan" count={blueAlive} active={isBlueTurn} />
          <div className="text-center">
            <div className="font-display text-[9px] uppercase tracking-[0.35em] text-slate-500">
              Turno
            </div>
            <div className="font-display text-xl font-bold text-white">
              {state.turnNumber}
            </div>
          </div>
          <TeamScore label="Vermelho" color="rose" count={redAlive} active={!isBlueTurn} reverse />
        </div>

        {/* UTILITÁRIOS */}
        <div className="flex items-center gap-2">
          <GameTooltip content="Guia tático e registro de inteligência" position="bottom">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Abrir informações"
              className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/20 text-cyan-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
            >
              <BookOpen size={16} />
            </button>
          </GameTooltip>

          <GameTooltip content="Configurações (em breve durante a partida)" position="bottom">
            <span className="flex h-9 w-9 items-center justify-center rounded border border-slate-700 text-slate-500">
              <Settings size={16} />
            </span>
          </GameTooltip>

          <GameTooltip content="Render-se" position="bottom">
            <Link to="/result">
              <GameButton variant="danger" size="sm">
                Encerrar Missão
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
