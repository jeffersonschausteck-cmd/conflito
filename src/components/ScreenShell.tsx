import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface Props {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
}

/**
 * Sprint MOBILE-01 — casca compartilhada por 9 telas (Modo, Créditos,
 * Login, Sala de Espera, Lobby Online, Perfil, Ranking, Configurações,
 * Resultado). Era `min-h-screen` com `py-24` + título `text-5xl` — em
 * qualquer altura curta de celular na horizontal isso sozinho já
 * ultrapassava a viewport. Agora é `h-dvh` (nunca a página inteira
 * rola); o título/eyebrow/subtitle encolhem via media query de altura;
 * `children` fica numa área `flex-1 overflow-y-auto` — quando o
 * conteúdo de uma tela específica é naturalmente longo (ex.: lista do
 * Ranking), ele rola SÓ ali dentro, sem a página/cabeçalho se moverem.
 */
export function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  backTo,
  backLabel = "← Back",
}: Props) {
  return (
    <main className="relative flex h-dvh w-screen flex-col overflow-hidden text-foreground">

      {/* Top HUD bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-2 font-display text-[9px] uppercase tracking-[0.2em] text-sky-100 [text-shadow:0_1px_2px_#000] [@media(min-height:480px)]:px-6 [@media(min-height:480px)]:py-4 [@media(min-height:480px)]:text-[10px] [@media(min-height:480px)]:tracking-[0.3em] sm:px-10">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <span>NET // SECURE</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-300">
          <span>◆</span>
          <span>CONFLITO</span>
        </div>
      </div>

      {backTo && (
        <div className="absolute left-4 top-8 z-30 [@media(min-height:480px)]:left-6 [@media(min-height:480px)]:top-14 sm:left-10">
          <Link
            to={backTo}
            className="pointer-events-auto rounded border border-cyan-400/50 bg-slate-950/75 px-3 py-1.5 font-display text-[9px] uppercase tracking-[0.2em] text-sky-100 transition-colors hover:border-cyan-300 hover:text-white [@media(min-height:480px)]:text-[10px] [@media(min-height:480px)]:tracking-[0.25em]"
          >
            {backLabel}
          </Link>
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center px-4 pt-10 pb-3 text-center animate-fade-in [@media(min-height:480px)]:px-6 [@media(min-height:480px)]:pt-24 [@media(min-height:480px)]:pb-6">
        {eyebrow && (
          <div className="shrink-0 font-display text-[9px] uppercase tracking-[0.3em] text-sky-100 [text-shadow:0_1px_2px_#000] [@media(min-height:480px)]:text-[10px] [@media(min-height:480px)]:tracking-[0.5em]">
            {eyebrow}
          </div>
        )}
        {title && (
          <div className="relative mt-1 inline-block shrink-0 px-8 [@media(min-height:480px)]:mt-3">
            <span className="absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2 bg-gradient-to-r from-rose-700 via-slate-900 to-sky-700 opacity-90 [clip-path:polygon(0_0,100%_0,97%_50%,100%_100%,0_100%,3%_50%)]" />
            <h1 className="relative font-display text-lg font-black uppercase tracking-[0.1em] text-white [-webkit-text-stroke:1px_rgba(10,20,40,0.7)] [text-shadow:0_0_14px_rgba(0,0,0,0.6),0_3px_0_rgba(0,0,0,0.55)] [@media(min-height:480px)]:text-3xl [@media(min-height:480px)]:tracking-[0.15em] sm:[@media(min-height:480px)]:text-5xl">
              {title}
            </h1>
          </div>
        )}
        {subtitle && (
          <p className="mt-1 max-w-xl shrink-0 font-display text-[10px] uppercase tracking-[0.2em] text-sky-50 [text-shadow:0_1px_3px_#000] [@media(min-height:480px)]:mt-4 [@media(min-height:480px)]:text-xs [@media(min-height:480px)]:tracking-[0.3em] sm:[@media(min-height:480px)]:text-sm">
            {subtitle}
          </p>
        )}
        <div className="mt-3 min-h-0 w-full flex-1 overflow-y-auto [@media(min-height:480px)]:mt-10">{children}</div>
      </div>
    </main>
  );
}
