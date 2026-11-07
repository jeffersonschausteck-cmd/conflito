import { createFileRoute } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GamePanel } from "@/components/ui/GamePanel";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "Créditos — Conflito" }] }),
  component: AboutPage,
});

const CREDITS = [
  { eyebrow: "// DESENVOLVIMENTO", title: "Desenvolvimento", body: "SCHAUSCODE" },
  { eyebrow: "// GAME DESIGN", title: "Game Design", body: "Jefferson Schausteck" },
  { eyebrow: "// PROGRAMAÇÃO", title: "Programação", body: "SCHAUSCODE" },
  { eyebrow: "// ARTE E INTERFACE", title: "Arte e Interface", body: "SCHAUSCODE" },
  { eyebrow: "// MÚSICA E ÁUDIO", title: "Música e Áudio", body: "IA + Curadoria SCHAUSCODE" },
] as const;

function AboutPage() {
  return (
    <ScreenShell
      eyebrow="// DOSSIER"
      title="Créditos"
      subtitle="Conflito"
      backTo="/"
      backLabel="← Início"
    >
      <div className="mx-auto max-w-2xl space-y-6 text-left">
        {CREDITS.map((c) => (
          <GamePanel key={c.title} variant="blue" eyebrow={c.eyebrow} title={c.title}>
            <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          </GamePanel>
        ))}

        <GamePanel variant="default" eyebrow="// AGRADECIMENTOS ESPECIAIS" title="Agradecimentos Especiais">
          <p className="text-sm leading-relaxed text-muted-foreground">
            À minha família, amigos e todos que contribuíram com ideias, testes
            e feedback durante o desenvolvimento de Conflito.
          </p>
        </GamePanel>

        <p className="text-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          © 2026 SCHAUSCODE
        </p>
      </div>
    </ScreenShell>
  );
}
