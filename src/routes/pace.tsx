import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { flowState } from "@/services/flowState";
import { PACES_ENABLED, RULES_BY_PACE } from "@/services/matchRules";
import type { Pace } from "@/types/gameState";

export const Route = createFileRoute("/pace")({
  head: () => ({ meta: [{ title: "Ritmo da Partida — Conflito" }] }),
  component: PacePage,
});

interface PaceCard {
  id: Pace;
  tag: string;
  name: string;
  minutes: string;
  description: string;
  hot?: boolean;
}

const CARDS: PaceCard[] = [
  { id: "blitz", tag: "Partida curta", name: "Relâmpago", minutes: "~6", description: "20 rodadas. A Maré chega cedo e o relógio aperta." },
  { id: "rapid", tag: "Recomendado", name: "Rápida", minutes: "~12", description: "30 rodadas. Pouca enrolação, mas ainda dá para planejar.", hot: true },
  { id: "classic", tag: "Partida longa", name: "Clássica", minutes: "20+", description: "As regras de sempre, sem relógio, sem Maré e sem limite de rodadas." },
];

const min = (ms: number) => `${Math.round(ms / 60000)} min`;

function details(id: Pace): string[] {
  const r = RULES_BY_PACE[id];
  if (!r) return ["Sem relógio", "Sem limite de rodadas", "Sem Maré"];
  return [
    `Relógio de ${min(r.clockMs)} por jogador`,
    `${r.turnMs / 1000} s por jogada`,
    `Maré a partir da rodada ${r.tideStartRound}`,
    `Fim por pontos na rodada ${r.roundLimit}`,
  ];
}

function PacePage() {
  const navigate = useNavigate();
  const choose = (pace: Pace) => {
    // Lado sorteado: o jogador tanto pode cair com o Azul quanto com o Vermelho.
    flowState.write({ pace, offlineOwner: Math.random() < 0.5 ? "blue" : "red" });
    navigate({ to: "/loading" });
  };

  return (
    <ScreenShell eyebrow="// ETAPA 02 / 03" title="ESCOLHA O RITMO" subtitle="Quanto tempo você quer jogar?" backTo="/mode" backLabel="← Modo">
      <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3 [@media(min-height:480px)]:gap-6">
        {CARDS.map((c) => (
          <GameCard
            key={c.id}
            state={c.hot && PACES_ENABLED[c.id] ? "selected" : "default"}
            onClick={PACES_ENABLED[c.id] ? () => choose(c.id) : undefined}
            style={{ cursor: PACES_ENABLED[c.id] ? "pointer" : "not-allowed", textAlign: "left", opacity: PACES_ENABLED[c.id] ? 1 : 0.55 }}
          >
            <div className="p-1 [@media(min-height:480px)]:p-2">
              <div className={`font-display text-[9px] uppercase tracking-[0.3em] [@media(min-height:480px)]:text-[10px] ${c.hot ? "text-amber-300" : "text-cyan-300"}`}>{PACES_ENABLED[c.id] ? c.tag : "Em ajuste"}</div>
              <h3 className="mt-1 font-display text-lg font-black uppercase tracking-[0.08em] text-white [@media(min-height:480px)]:text-2xl">{c.name}</h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`font-display text-2xl font-black [@media(min-height:480px)]:text-3xl ${c.hot ? "text-amber-300" : "text-white"}`}>{c.minutes}</span>
                <span className="font-display text-[10px] uppercase tracking-widest text-sky-200">min</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-sky-50 [@media(min-height:480px)]:mt-2 [@media(min-height:480px)]:text-sm">{c.description}</p>
              <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-[11px] text-slate-100 [@media(min-height:480px)]:text-sm">
                {details(c.id).map((d) => (
                  <li key={d}>◆ {d}</li>
                ))}
              </ul>
              <GameButton variant={PACES_ENABLED[c.id] ? "primary" : "secondary"} disabled={!PACES_ENABLED[c.id]} size="sm" className="mt-3 w-full">
                {PACES_ENABLED[c.id] ? "▶ Jogar" : "Em breve"}
              </GameButton>
            </div>
          </GameCard>
        ))}
      </div>
    </ScreenShell>
  );
}
