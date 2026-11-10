import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { withAuth } from "@/components/RequireAuth";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { MenuTitle } from "@/components/ui/MenuTitle";
import { flowState } from "@/services/flowState";
import { PACES_ENABLED } from "@/services/matchRules";
import { armySize, formatFor } from "@/services/battleFormat";
import type { Pace } from "@/types/gameState";

export const Route = createFileRoute("/pace")({
  head: () => ({ meta: [{ title: "Modo de Jogo — Conflito" }] }),
  component: withAuth(PacePage),
});

interface PaceCard {
  id: Pace;
  name: string;
  description: string;
}

// Os modos diferem só no tamanho do tabuleiro e na quantidade de peças (docs/04-Regras.md, seção 19).
const CARDS: PaceCard[] = [
  { id: "blitz", name: "Partida Rápida", description: "Exército e campo bem pequenos: o confronto começa logo." },
  { id: "rapid", name: "Partida Normal", description: "Exército e campo de tamanho médio, com espaço para uma boa estratégia." },
  { id: "classic", name: "Partida Intensa", description: "O exército completo no campo inteiro: a batalha mais longa." },
];

function details(id: Pace): string[] {
  const f = formatFor(id);
  return [`${armySize(f)} peças por lado`, `Tabuleiro ${f.rows} × ${f.cols}`, `Posicionamento em ${f.depth} colunas`];
}

function PacePage() {
  const navigate = useNavigate();
  const choose = (pace: Pace) => {
    // Lado sorteado: o jogador tanto pode cair com o Azul quanto com o Vermelho.
    flowState.write({ pace, offlineOwner: Math.random() < 0.5 ? "blue" : "red" });
    navigate({ to: "/loading" });
  };

  return (
    <ScreenShell eyebrow="// ETAPA 02 / 03" title="ESCOLHA O MODO" subtitle="Qual o tamanho da batalha?" backTo="/mode" backLabel="← Modo">
      <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3 [@media(min-height:480px)]:gap-6">
        {CARDS.map((c) => (
          <GameCard
            key={c.id}
            state="default"
            onClick={PACES_ENABLED[c.id] ? () => choose(c.id) : undefined}
            style={{ cursor: PACES_ENABLED[c.id] ? "pointer" : "not-allowed", textAlign: "left", opacity: PACES_ENABLED[c.id] ? 1 : 0.55 }}
          >
            <div className="p-1 [@media(min-height:480px)]:p-2">
              <MenuTitle eyebrow="Partida" title={c.name.replace("Partida ", "")} />
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`font-display text-2xl font-black [@media(min-height:480px)]:text-3xl text-white`}>{armySize(formatFor(c.id))}</span>
                <span className="font-display text-[10px] uppercase tracking-widest text-sky-200">peças</span>
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
