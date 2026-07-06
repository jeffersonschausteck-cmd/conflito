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
];

function ModeSelectPage() {
  const navigate = useNavigate();

  const onSelect = (mode: ModeCard) => {
    if (mode.disabled) return;

    if (mode.online) {
      flowState.write({ mode: mode.id, online: true });
      const destination = AuthClient.isAuthenticated() ? "/online-lobby" : "/login";
      navigate({ to: destination });
      return;
    }

    flowState.write({ mode: mode.id, online: false });
    navigate({ to: "/loading" });
  };

  return (
    <ScreenShell
      eyebrow="// ETAPA 01 / 03"
      title="CENTRO DE OPEÇÕES"
      subtitle="Escolha sua próxima missão."
      backTo="/"
      backLabel="← Início"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {MODES.map((m) => (
          <GameCard
            key={m.name}
            state={m.disabled ? "disabled" : "default"}
            hoverable={!m.disabled}
            onClick={() => onSelect(m)}
            style={{ cursor: m.disabled ? "not-allowed" : "pointer", textAlign: "left" }}
          >
            <div className="p-2">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-[10px] uppercase tracking-[0.4em] text-primary/80">
                  {m.tagline}
                </div>
                {m.disabled && (
                  <StatusBadge color="red" label="Bloqueado" />
                )}
              </div>
              <h3 className="font-display text-2xl font-bold uppercase tracking-[0.1em] text-foreground">
                {m.name}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {m.description}
              </p>
              <div className="mt-6 font-display text-[10px] uppercase tracking-[0.3em]">
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

      <div className="mt-12 flex justify-center">
        <Link to="/">
          <GameButton variant="ghost" size="md">Cancelar</GameButton>
        </Link>
      </div>
    </ScreenShell>
  );
}
