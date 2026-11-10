import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuthClient } from "@/multiplayer/AuthClient";

/**
 * Login obrigatório (docs/16 - Sistema de Contas): sem conta logada não se joga. Envolve as telas de jogo;
 * quem não está logado é levado à tela de login e a tela nem chega a aparecer.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (AuthClient.isAuthenticated()) setAllowed(true);
    else navigate({ to: "/login", replace: true });
  }, [navigate]);

  return allowed ? <>{children}</> : null;
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
