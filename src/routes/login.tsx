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
import { useMenuMusic } from "@/hooks/useMenuMusic";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Conflito" }] }),
  component: LoginPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Espera entre dois pedidos de código (igual ao servidor). */
const RESEND_SECONDS = 60;

function LoginPage() {
  const navigate = useNavigate();
  useMenuMusic();
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Confirmação de e-mail: de quem é a conta, o e-mail mascarado e (só no desenvolvimento local) o código.
  const [pending, setPending] = useState<{ nickname: string; email: string; devCode?: string } | null>(null);
  const [resendLeft, setResendLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quem já está logado não precisa ver o login: vai direto ao Centro de Operações (para trocar de conta, use "Sair da conta").
  useEffect(() => {
    if (AuthClient.isAuthenticated()) navigate({ to: "/mode", replace: true });
  }, [navigate]);

  useEffect(() => {
    const client = ensureConnected();
    return client.onEvent((event) => {
      if (event.type === "AuthSuccess") {
        AuthClient.saveSession({ token: event.token, profile: event.profile });
        setLoading(false);
        flowState.write({ online: true });
        navigate({ to: "/mode" });
      }
      if (event.type === "VerificationRequired") {
        setLoading(false);
        setError(null);
        setPending({ nickname: event.nickname, email: event.email, devCode: event.devCode });
        setCode("");
        setMode("verify");
        setInfo(`Enviamos um código de 6 dígitos para ${event.email}.`);
        setResendLeft(RESEND_SECONDS);
      }
      if (event.type === "AuthError") {
        setLoading(false);
        setError(event.reason);
      }
    });
  }, [navigate]);

  // Contagem regressiva do botão "Reenviar código".
  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = window.setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendLeft]);

  const handleSubmit = () => {
    setError(null);
    setInfo(null);
    if (!nickname.trim() || !password.trim()) {
      setError("Preencha nickname e senha.");
      return;
    }
    if (mode === "register" && !EMAIL_RE.test(email.trim())) {
      setError("Informe um e-mail válido. Ele é obrigatório e vai receber o código de confirmação.");
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

  const handleVerify = () => {
    setError(null);
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6 || !pending) {
      setError("Digite o código de 6 dígitos.");
      return;
    }
    setLoading(true);
    AuthClient.verifyEmail(ensureConnected(), pending.nickname, digits);
  };

  const handleResend = () => {
    if (!pending || resendLeft > 0) return;
    setError(null);
    AuthClient.resendVerification(ensureConnected(), pending.nickname);
  };

  const verifying = mode === "verify" && pending;

  return (
    <ScreenShell
      eyebrow="// AUTENTICAÇÃO"
      title="ACESSO ONLINE"
      subtitle="Faça login para jogar."
      backTo="/"
      backLabel="← Início"
    >
      <div className="mx-auto max-w-md">
        <GamePanel
          variant="blue"
          eyebrow="// CONTA"
          title={verifying ? "Confirmar e-mail" : mode === "login" ? "Entrar" : "Criar Conta"}
        >
          {verifying ? (
            <div className="space-y-4">
              {info && <p className="text-sm text-sky-100">{info}</p>}
              <p className="text-xs text-muted-foreground">O código vale por 15 minutos. Olhe também a caixa de spam.</p>
              {pending.devCode && (
                <p className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                  Modo de desenvolvimento: o código é <strong className="tracking-[0.3em]">{pending.devCode}</strong>
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Código</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerify();
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="text-center text-xl tracking-[0.5em]"
                  autoFocus
                />
              </div>

              {error && <StatusBadge color="red" label={error} />}

              <GameButton variant="primary" size="lg" className="w-full" disabled={loading} onClick={handleVerify}>
                {loading ? "Confirmando..." : "Confirmar"}
              </GameButton>

              <button
                type="button"
                disabled={resendLeft > 0}
                className="w-full text-center text-xs uppercase tracking-[0.2em] text-cyan-400 enabled:hover:text-cyan-300 disabled:text-muted-foreground"
                onClick={handleResend}
              >
                {resendLeft > 0 ? `Reenviar código em ${resendLeft} s` : "Reenviar código"}
              </button>
              <button
                type="button"
                className="w-full text-center text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setPending(null);
                  setMode("login");
                }}
              >
                ← Voltar
              </button>
            </div>
          ) : (
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
                    E-mail (obrigatório)
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Vamos enviar um código para confirmar a conta.</p>
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
          )}
        </GamePanel>
      </div>
    </ScreenShell>
  );
}
