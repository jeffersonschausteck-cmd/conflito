import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { flowState } from "@/services/flowState";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Conflito" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const client = ensureConnected();
    return client.onEvent((event) => {
      if (event.type === "AuthSuccess") {
        AuthClient.saveSession({ token: event.token, profile: event.profile });
        setLoading(false);
        flowState.write({ online: true });
        navigate({ to: "/online-lobby" });
      }
      if (event.type === "AuthError") {
        setLoading(false);
        setError(event.reason);
      }
    });
  }, [navigate]);

  const handleSubmit = () => {
    setError(null);
    if (!nickname.trim() || !password.trim()) {
      setError("Preencha nickname e senha.");
      return;
    }
    setLoading(true);
    const client = ensureConnected();
    if (mode === "login") {
      AuthClient.login(client, nickname, password);
    } else {
      AuthClient.register(client, nickname, email, password);
    }
  };

  return (
    <ScreenShell
      eyebrow="// AUTENTICAÇÃO"
      title="ACESSO ONLINE"
      subtitle="Login obrigatório para partidas online."
      backTo="/mode"
      backLabel="← Modo"
    >
      <div className="mx-auto max-w-md">
        <GamePanel variant="blue" eyebrow="// CONTA" title={mode === "login" ? "Entrar" : "Criar Conta"}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Nickname
              </label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Comandante" />
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  E-mail
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>

            {error && <StatusBadge color="red" label={error} />}

            <GameButton
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Conectando..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </GameButton>

            <button
              type="button"
              className="w-full text-center text-xs uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300"
              onClick={() => {
                setError(null);
                setMode(mode === "login" ? "register" : "login");
              }}
            >
              {mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
            </button>
          </div>
        </GamePanel>
      </div>
    </ScreenShell>
  );
}
