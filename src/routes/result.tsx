import { createFileRoute, Link } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { ScifiFrame } from "@/components/ui/ScifiFrame";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [{ title: "Resultado da Missão — Conflito" }],
  }),
  component: ResultPage,
});

function ResultPage() {
  const result =
    typeof window !== "undefined"
      ? JSON.parse(
        window.sessionStorage.getItem("conflict:lastResult") ?? "{}"
      )
      : {};

  const isWin = result.winner === "BLUE";
  const loserLabel = result.winner === "BLUE" ? "Vermelha" : "Azul";

  return (
    <ScreenShell
      backTo="/"
      backLabel="← Início"
      title={isWin ? "MISSÃO CONCLUÍDA" : "MISSÃO FRACASSADA"}
      subtitle={
        isWin
          ? "Sua ofensiva foi concluída com sucesso."
          : "O exército inimigo capturou sua Bandeira."
      }
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-8">
        <ScifiFrame
          variant={isWin ? "cyan" : "red"}
          eyebrow="// RELATÓRIO"
          tabLabel="RESUMO DA PARTIDA"
          className="w-full text-left"
        >
          <div className="space-y-2">
            <SummaryRow label="Resultado" value={isWin ? "Vitória" : "Derrota"} />
            <SummaryRow label="Motivo do encerramento" value={`Bandeira ${loserLabel} capturada`} />
            <SummaryRow label="Número de turnos" value={String(result.turn ?? "—")} />
            <SummaryRow label="Tempo da partida" value="—" />
            <SummaryRow label="Peças restantes (Azul)" value="—" />
            <SummaryRow label="Peças restantes (Vermelho)" value="—" />
          </div>
        </ScifiFrame>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link to="/mode">
            <GameButton variant="primary" size="lg">▶ Nova Partida</GameButton>
          </Link>
          <Link to="/">
            <GameButton variant="secondary" size="md">Menu Principal</GameButton>
          </Link>
        </div>
      </div>
    </ScreenShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-1.5 text-xs last:border-0">
      <span className="uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="font-bold uppercase tracking-[0.08em] text-game-text">{value}</span>
    </div>
  );
}
