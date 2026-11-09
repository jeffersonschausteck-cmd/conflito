import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { flowState, type GameMode } from "@/services/flowState";
import { AuthClient } from "@/multiplayer/AuthClient";

export const Route = createFileRoute("/mode")({
  head: () => ({
    meta: [{ title: "Modo de Jogo — Conflito" }],
  }),
  component: ModeSelectPage,
});

interface ModeCard {
  id: GameMode;
  name: string;
  tagline: string;
  description: string;
  online?: boolean;
  disabled?: boolean;
  /** Atalho para outra tela (não inicia partida). */
  to?: "/oficina";
}

const MODES: ModeCard[] = [
  {
    id: "classic",
    name: "Campanha",
    tagline: "Missões Oficiais",
    description: "Jogue a campanha principal.",
  },
  {
    id: "modern",
    name: "Escaramuça",
    tagline: "Contra a IA",
    description: "Partidas rápidas contra o computador.",
  },
  {
    id: "modern",
    name: "Multijogador",
    tagline: "Online",
    description: "Dispute partidas contra outros comandantes. Requer login.",
    online: true,
  },
  {
    id: "classic",
    name: "Oficina do Exército",
    tagline: "Personalização",
    description: "Escolha o visual dos seus personagens. As mudanças valem nas próximas partidas.",
    to: "/oficina",
  },
];

function ModeSelectPage() {
  const navigate = useNavigate();

  const onSelect = (mode: ModeCard) => {
    if (mode.disabled) return;

    if (mode.to) {
      navigate({ to: mode.to });
      return;
    }

    if (mode.online) {
      flowState.write({ mode: mode.id, online: true });
      const destination = AuthClient.isAuthenticated() ? "/online-lobby" : "/login";
      navigate({ to: destination });
      return;
    }

    flowState.write({ mode: mode.id, online: false });
    navigate({ to: "/pace" });
  };

  return (
    <ScreenShell
      eyebrow="// ETAPA 01 / 03"
      title="CENTRO DE OPERAÇÕES"
      subtitle="Escolha sua próxima missão."
      backTo="/"
      backLabel="← Início"
    >
      <div className="grid gap-2 sm:grid-cols-2 [@media(min-height:480px)]:gap-6">
        {MODES.map((m) => (
          <GameCard
            key={m.name}
            state={m.disabled ? "disabled" : "default"}
            hoverable={!m.disabled}
            onClick={() => onSelect(m)}
            style={{ cursor: m.disabled ? "not-allowed" : "pointer", textAlign: "left" }}
          >
            <div className="p-1 [@media(min-height:480px)]:p-2">
              <div className="flex items-center justify-between mb-1 [@media(min-height:480px)]:mb-3">
                <div className="font-display text-[9px] uppercase tracking-[0.3em] text-primary/80 [@media(min-height:480px)]:text-[10px] [@media(min-height:480px)]:tracking-[0.4em]">
                  {m.tagline}
                </div>
                {m.disabled && (
                  <StatusBadge color="red" label="Bloqueado" />
                )}
              </div>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground [@media(min-height:480px)]:text-2xl">
                {m.name}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground [@media(min-height:480px)]:mt-4 [@media(min-height:480px)]:text-sm [@media(min-height:480px)]:leading-relaxed">
                {m.description}
              </p>
              <div className="mt-1.5 font-display text-[9px] uppercase tracking-[0.2em] [@media(min-height:480px)]:mt-6 [@media(min-height:480px)]:text-[10px] [@media(min-height:480px)]:tracking-[0.3em]">
                {m.disabled ? (
                  <span className="text-destructive/70">⛔ Locked</span>
                ) : (
                  <StatusBadge color="green" label="▶ ▶ Selecionar" />
                )}
              </div>
            </div>
          </GameCard>
        ))}
      </div>

      <div className="mt-2 flex justify-center [@media(min-height:480px)]:mt-12">
        <Link to="/">
          <GameButton variant="ghost" size="sm">Cancelar</GameButton>
        </Link>
      </div>
    </ScreenShell>
  );
}
