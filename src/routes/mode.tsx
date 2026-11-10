import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { withAuth } from "@/components/RequireAuth";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GameCard } from "@/components/ui/GameCard";
import { MenuTitle } from "@/components/ui/MenuTitle";
import { flowState, type GameMode } from "@/services/flowState";
import { AuthClient } from "@/multiplayer/AuthClient";
import { getNetworkClient } from "@/multiplayer/networkSingleton";

export const Route = createFileRoute("/mode")({
  head: () => ({
    meta: [{ title: "Modo de Jogo — Conflito" }],
  }),
  component: withAuth(ModeSelectPage),
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

// Três opções (docs/08-Interface.md, "Login Obrigatório e Centro de Operações"): contra a IA não conta pontos;
// o multijogador é sempre ranqueado e é a única forma de pontuar.
const MODES: ModeCard[] = [
  {
    id: "classic",
    name: "Campanha",
    tagline: "Contra a IA",
    description: "Enfrente o computador no tamanho de partida que quiser. Não conta pontos.",
  },
  {
    id: "modern",
    name: "Multijogador",
    tagline: "Ranqueada",
    description: "Dispute partidas ranqueadas contra outros comandantes. Vale pontos no ranking do modo.",
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
      navigate({ to: "/online-lobby" });
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
      <div className="grid gap-2 sm:grid-cols-3 [@media(min-height:480px)]:gap-6">
        {MODES.map((m) => (
          <GameCard
            key={m.name}
            state={m.disabled ? "disabled" : "default"}
            hoverable={!m.disabled}
            onClick={() => onSelect(m)}
            style={{ cursor: m.disabled ? "not-allowed" : "pointer", textAlign: "left" }}
          >
            <div className="p-1 [@media(min-height:480px)]:p-2">
              <MenuTitle eyebrow={m.tagline} title={m.name} />
              <p className="mt-1 text-[11px] leading-snug text-sky-50 [@media(min-height:480px)]:mt-3 [@media(min-height:480px)]:text-sm">
                {m.description}
              </p>
              <GameButton variant={m.disabled ? "secondary" : "primary"} disabled={m.disabled} size="sm" className="mt-2 w-full [@media(min-height:480px)]:mt-4">
                {m.disabled ? "Bloqueado" : "▶ Selecionar"}
              </GameButton>
            </div>
          </GameCard>
        ))}
      </div>

      <div className="mt-2 flex justify-center [@media(min-height:480px)]:mt-12">
        <Link to="/">
          <GameButton variant="ghost" size="sm">Cancelar</GameButton>
        </Link>
        <GameButton
          variant="ghost"
          size="sm"
          className="ml-2"
          onClick={() => {
            const client = getNetworkClient();
            AuthClient.logout(client);
            client.disconnect();
            navigate({ to: "/login" });
          }}
        >
          Sair da conta
        </GameButton>
      </div>
    </ScreenShell>
  );
}
