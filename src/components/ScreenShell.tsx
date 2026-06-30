import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";

interface Props {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  backTo,
  backLabel = "← Back",
}: Props) {
  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <CyberBackground />

      {/* Top HUD bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:px-10">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <span>NET // SECURE</span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <span>◆</span>
          <span>SHADOW COMMAND</span>
        </div>
      </div>

      {backTo && (
        <div className="absolute left-6 top-14 z-30 sm:left-10">
          <Link
            to={backTo}
            className="pointer-events-auto font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-primary"
          >
            {backLabel}
          </Link>
        </div>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center animate-fade-in">
        {eyebrow && (
          <div className="font-display text-[10px] uppercase tracking-[0.5em] text-primary/80">
            {eyebrow}
          </div>
        )}
        {title && (
          <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-[0.15em] text-foreground sm:text-5xl text-glow">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="mt-4 max-w-xl font-display text-xs uppercase tracking-[0.3em] text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        )}
        <div className="mt-10 w-full">{children}</div>
      </div>
    </main>
  );
}
