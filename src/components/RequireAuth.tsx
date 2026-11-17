import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuthClient } from "@/multiplayer/AuthClient";
import { flowState } from "@/services/flowState";

/**
 * Login obrigatório (docs/16 - Sistema de Contas): sem conta logada não se joga. Envolve as telas de jogo;
 * quem não está logado é levado à tela de login e a tela nem chega a aparecer.
 */
export function RequireAuth({ children, guestCampaign = false }: { children: ReactNode; guestCampaign?: boolean }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Visitante sem conta só entra na Campanha (contra o computador, sem pontos): o fluxo offline foi escolhido na tela de modo.
    if (AuthClient.isAuthenticated() || (guestCampaign && flowState.read().online === false)) setAllowed(true);
    else navigate({ to: "/login", replace: true });
  }, [navigate, guestCampaign]);

  return allowed ? <>{children}</> : null;
}

/** Como `withAuth`, mas deixa entrar sem conta quem está no fluxo da Campanha (contra o computador). */
export function withAuthUnlessCampaign(Component: () => ReactNode): () => ReactNode {
  function Guarded() {
    return (
      <RequireAuth guestCampaign>
        <Component />
      </RequireAuth>
    );
  }
  return Guarded;
}

/** Versão para usar direto em `createFileRoute(...)({ component: withAuth(Tela) })`. */
export function withAuth(Component: () => ReactNode): () => ReactNode {
  function Guarded() {
    return (
      <RequireAuth>
        <Component />
      </RequireAuth>
    );
  }
  return Guarded;
}
