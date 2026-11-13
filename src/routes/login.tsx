import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { Input } from "@/components/ui/input";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import type { NetworkClient } from "@/multiplayer/NetworkClient";
import { flowState } from "@/services/flowState";
import { useMenuMusic } from "@/hooks/useMenuMusic";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Conflito" }] }),
  component: LoginPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Espera entre dois pedidos de código (igual ao servidor). */
const RESEND_SECONDS = 60;
/** Quanto esperar a conexão com o servidor abrir antes de avisar o jogador. */
const CONNECT_TIMEOUT_MS = 8000;
/** Quanto esperar a resposta do servidor depois de enviar. */
const REPLY_TIMEOUT_MS = 15000;

type Mode = "login" | "register" | "verify" | "forgot" | "reset";

/** Mensagem de retorno ao jogador (erro em vermelho, acerto em verde). */
function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const tone =
    kind === "error"
      ? "border-red-400/50 bg-red-500/10 text-red-200"
      : kind === "success"
        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
        : "border-sky-400/40 bg-sky-500/10 text-sky-100";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm leading-snug ${tone}`}>
      {kind === "error" ? "⚠ " : kind === "success" ? "✔ " : ""}
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{children}</label>;
}

function LoginPage() {
  const navigate = useNavigate();
  useMenuMusic();
  const [mode, setMode] = useState<Mode>("login");
  // Nickname ou e-mail no login e no "esqueci minha senha"; só o nickname no cadastro.
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  // Confirmação de e-mail / redefinição de senha: de quem é a conta, o e-mail mascarado e (só no desenvolvimento local) o código.
  const [pending, setPending] = useState<{ nickname: string; email: string; devCode?: string } | null>(null);
  const [resendLeft, setResendLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const replyTimer = useRef<number | null>(null);

  const clearReplyTimer = () => {
    if (replyTimer.current !== null) {
      window.clearTimeout(replyTimer.current);
      replyTimer.current = null;
    }
  };
  useEffect(() => clearReplyTimer, []);

  // Quem já está logado não precisa ver o login: vai direto ao Centro de Operações (para trocar de conta, use "Sair da conta").
  useEffect(() => {
    if (AuthClient.isAuthenticated()) navigate({ to: "/mode", replace: true });
  }, [navigate]);

  useEffect(() => {
    const client = ensureConnected();
    return client.onEvent((event) => {
      if (event.type === "AuthSuccess") {
        clearReplyTimer();
        AuthClient.saveSession({ token: event.token, profile: event.profile });
        setError(null);
        setInfo(null);
        setSuccess(`Login realizado! Bem-vindo, ${event.profile.nickname}. Entrando...`);
        flowState.write({ online: true });
        // Um instante para o jogador ler a confirmação antes de trocar de tela.
        window.setTimeout(() => navigate({ to: "/mode" }), 900);
      }
      if (event.type === "VerificationRequired") {
        clearReplyTimer();
        setLoading(false);
        setError(null);
        setSuccess(null);
        setPending({ nickname: event.nickname, email: event.email, devCode: event.devCode });
        setCode("");
        setMode("verify");
        setInfo(`Enviamos um código de 6 dígitos para ${event.email}.`);
        setResendLeft(RESEND_SECONDS);
      }
      if (event.type === "PasswordResetSent") {
        clearReplyTimer();
        setLoading(false);
        setError(null);
        setSuccess(null);
        setPending({ nickname: event.nickname, email: event.email, devCode: event.devCode });
        setCode("");
        setNewPassword("");
        setConfirmPassword("");
        setMode("reset");
        setInfo(`Enviamos um código de 6 dígitos para ${event.email}.`);
        setResendLeft(RESEND_SECONDS);
      }
      if (event.type === "PasswordResetDone") {
        clearReplyTimer();
        setLoading(false);
        setError(null);
        setInfo(null);
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setCode("");
        setMode("login");
        setSuccess("Senha alterada. Entre com a nova senha.");
      }
      if (event.type === "AuthError") {
        clearReplyTimer();
        setLoading(false);
        setSuccess(null);
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

  /**
   * Envia uma mensagem ao servidor sempre devolvendo um retorno ao jogador: espera a conexão abrir (se o
   * jogador clicou cedo demais), avisa se não conectou e avisa se o servidor não respondeu a tempo.
   */
  const sendToServer = (send: (client: NetworkClient) => void) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    clearReplyTimer();
    const client = ensureConnected();
    const started = Date.now();
    const attempt = () => {
      try {
        send(client);
        replyTimer.current = window.setTimeout(() => {
          setLoading(false);
          setError("O servidor não respondeu. Verifique sua conexão e tente de novo.");
        }, REPLY_TIMEOUT_MS);
      } catch {
        if (Date.now() - started > CONNECT_TIMEOUT_MS) {
          setLoading(false);
          setError("Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.");
          return;
        }
        window.setTimeout(attempt, 300); // ainda conectando: tenta de novo daqui a pouco
      }
    };
    attempt();
  };

  const go = (next: Mode) => {
    setError(null);
    setInfo(null);
    setSuccess(null);
    setMode(next);
  };

  const handleSubmit = () => {
    setInfo(null);
    const who = nickname.trim();
    if (!who) {
      setSuccess(null);
      setError(mode === "login" ? "Informe seu usuário ou e-mail." : "Informe um nickname.");
      return;
    }
    if (!password) {
      setSuccess(null);
      setError("Digite sua senha.");
      return;
    }
    if (mode === "register" && !EMAIL_RE.test(email.trim())) {
      setSuccess(null);
      setError("Informe um e-mail válido. Ele é obrigatório e vai receber o código de confirmação.");
      return;
    }
    if (mode === "login") sendToServer((c) => AuthClient.login(c, who, password));
    else sendToServer((c) => AuthClient.register(c, who, email, password));
  };

  const handleVerify = () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6 || !pending) {
      setSuccess(null);
      setError("Digite o código de 6 dígitos.");
      return;
    }
    sendToServer((c) => AuthClient.verifyEmail(c, pending.nickname, digits));
  };

  const handleResend = () => {
    if (!pending || resendLeft > 0) return;
    sendToServer((c) => (mode === "reset" ? AuthClient.forgotPassword(c, pending.nickname) : AuthClient.resendVerification(c, pending.nickname)));
  };

  const handleForgot = () => {
    const who = nickname.trim();
    if (!who) {
      setSuccess(null);
      setError("Informe seu usuário ou e-mail.");
      return;
    }
    sendToServer((c) => AuthClient.forgotPassword(c, who));
  };

  const handleReset = () => {
    const digits = code.replace(/\D/g, "");
    if (!pending) return;
    setSuccess(null);
    if (digits.length !== 6) {
      setError("Digite o código de 6 dígitos que chegou no e-mail.");
      return;
    }
    if (newPassword.length < 4) {
      setError("A nova senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As duas senhas não são iguais.");
      return;
    }
    sendToServer((c) => AuthClient.resetPassword(c, pending.nickname, digits, newPassword));
  };

  const enter = (action: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) action();
  };

  const title =
    mode === "verify" ? "Confirmar e-mail" : mode === "forgot" ? "Esqueci minha senha" : mode === "reset" ? "Nova senha" : mode === "login" ? "Entrar" : "Criar Conta";

  const messages = (
    <>
      {success && <Notice kind="success">{success}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
    </>
  );

  const devCodeBox = pending?.devCode && (
    <p className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
      Modo de desenvolvimento: o código é <strong className="tracking-[0.3em]">{pending.devCode}</strong>
    </p>
  );

  const resendButton = (
    <button
      type="button"
      disabled={resendLeft > 0 || loading}
      className="w-full text-center text-xs uppercase tracking-[0.2em] text-cyan-400 enabled:hover:text-cyan-300 disabled:text-muted-foreground"
      onClick={handleResend}
    >
      {resendLeft > 0 ? `Reenviar código em ${resendLeft} s` : "Reenviar código"}
    </button>
  );

  const backToLogin = (
    <button
      type="button"
      className="w-full text-center text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      onClick={() => {
        setPending(null);
        go("login");
      }}
    >
      ← Voltar ao login
    </button>
  );

  return (
    <ScreenShell eyebrow="// AUTENTICAÇÃO" title="ACESSO ONLINE" subtitle="Faça login para jogar." backTo="/" backLabel="← Início">
      <div className="mx-auto max-w-md">
        <GamePanel variant="blue" eyebrow="// CONTA" title={title}>
          {mode === "verify" && pending ? (
            <div className="space-y-4">
              {info && <p className="text-sm text-sky-100">{info}</p>}
              <p className="text-xs text-muted-foreground">O código vale por 15 minutos. Olhe também a caixa de spam.</p>
              {devCodeBox}
              <div>
                <Label>Código</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={enter(handleVerify)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="text-center text-xl tracking-[0.5em]"
                  autoFocus
                />
              </div>
              {messages}
              <GameButton variant="primary" size="lg" className="w-full" disabled={loading} onClick={handleVerify}>
                {loading ? "Confirmando..." : "Confirmar"}
              </GameButton>
              {resendButton}
              {backToLogin}
            </div>
          ) : mode === "forgot" ? (
            <div className="space-y-4">
              <p className="text-sm text-sky-100">Informe o seu usuário ou o e-mail da conta. Vamos enviar um código de 6 dígitos para o e-mail cadastrado.</p>
              <div>
                <Label>Usuário ou e-mail</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={enter(handleForgot)}
                  placeholder="Comandante ou voce@email.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {messages}
              <GameButton variant="primary" size="lg" className="w-full" disabled={loading} onClick={handleForgot}>
                {loading ? "Enviando..." : "Enviar código"}
              </GameButton>
              {backToLogin}
            </div>
          ) : mode === "reset" && pending ? (
            <div className="space-y-4">
              {info && <p className="text-sm text-sky-100">{info}</p>}
              <p className="text-xs text-muted-foreground">O código vale por 15 minutos. Olhe também a caixa de spam.</p>
              {devCodeBox}
              <div>
                <Label>Código</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="text-center text-xl tracking-[0.5em]"
                  autoFocus
                />
              </div>
              <div>
                <Label>Nova senha</Label>
                <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="••••••" />
              </div>
              <div>
                <Label>Repita a nova senha</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={enter(handleReset)}
                  autoComplete="new-password"
                  placeholder="••••••"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Mostrar senhas
              </label>
              {messages}
              <GameButton variant="primary" size="lg" className="w-full" disabled={loading} onClick={handleReset}>
                {loading ? "Salvando..." : "Redefinir senha"}
              </GameButton>
              {resendButton}
              {backToLogin}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>{mode === "login" ? "Usuário ou e-mail" : "Nickname"}</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={enter(handleSubmit)}
                  placeholder={mode === "login" ? "Comandante ou voce@email.com" : "Comandante"}
                  autoComplete="username"
                />
              </div>

              {mode === "register" && (
                <div>
                  <Label>E-mail (obrigatório)</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={enter(handleSubmit)} placeholder="voce@email.com" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Vamos enviar um código para confirmar a conta.</p>
                </div>
              )}

              <div>
                <Label>Senha</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={enter(handleSubmit)}
                    placeholder="••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="shrink-0 text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {mode === "login" && (
                  <button
                    type="button"
                    className="mt-2 block text-[11px] uppercase tracking-[0.15em] text-cyan-400 hover:text-cyan-300"
                    onClick={() => go("forgot")}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>

              {messages}

              <GameButton variant="primary" size="lg" className="w-full" disabled={loading} onClick={handleSubmit}>
                {loading ? "Conectando..." : mode === "login" ? "Entrar" : "Cadastrar"}
              </GameButton>

              <button
                type="button"
                className="w-full text-center text-xs uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300"
                onClick={() => go(mode === "login" ? "register" : "login")}
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
