import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getNetworkClient } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { useMenuMusic } from "@/hooks/useMenuMusic";
import { formatClock, formatTimeAgo, formatTotalPlayTime } from "@/lib/formatClock";
import type { MatchHistoryEntry, MyStatsData } from "@/types/ranking";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Perfil do Comandante — Conflito" }] }),
  component: ProfilePage,
});

/**
 * Sprint RANKING-02 — mesmo padrão de conexão de `ranking.tsx`
 * (`ensureLobbyConnection` + `ResumeSession` + `onEvent`), agora
 * pedindo `GetMyStats` + `GetMatchHistory` em paralelo — dois eventos
 * já existentes/mínimos, sem `GetMyProfile` redundante.
 */
function ProfilePage() {
  const navigate = useNavigate();
  useMenuMusic();
  const session = AuthClient.readSession();
  const [stats, setStats] = useState<MyStatsData | null>(null);
  const [matches, setMatches] = useState<MatchHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    const client = getNetworkClient();
    client.ensureLobbyConnection();
    return client.onEvent((event) => {
      if (event.type === "PlayerConnected") {
        client.send({ type: "ResumeSession", token: session.token });
      }
      if (event.type === "AuthSuccess") {
        client.send({ type: "GetMyStats" });
        client.send({ type: "GetMatchHistory", limit: 20 });
      }
      if (event.type === "MyStatsData") {
        setStats(event.stats);
      }
      if (event.type === "MatchHistoryData") {
        setMatches(event.matches);
      }
    });
  }, [navigate, session]);

  if (!session) return null;

  return (
    <ScreenShell
      eyebrow="// COMANDO"
      title="PERFIL DO COMANDANTE"
      subtitle={session.profile.nickname.toUpperCase()}
      backTo="/mode"
      backLabel="← Modo"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <HeaderCard stats={stats} fallbackNickname={session.profile.nickname} />
        <StatsGrid stats={stats} />
        <HistorySection matches={matches} />
      </div>
    </ScreenShell>
  );
}

function HeaderCard({ stats, fallbackNickname }: { stats: MyStatsData | null; fallbackNickname: string }) {
  return (
    <GamePanel variant="blue" eyebrow="// IDENTIDADE">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="font-display text-xl font-bold uppercase tracking-[0.15em] text-foreground">
          {stats?.username ?? fallbackNickname}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Patente</span>
            <StatusBadge color="blue" label={stats?.rankTier ?? "SOLDADO"} />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rating</span>
            <span className="font-display text-2xl font-black text-cyan-300">{stats?.rating ?? 500}</span>
          </div>
        </div>
        {stats?.position !== null && stats?.position !== undefined && (
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Posição no Ranking: #{stats.position}
          </span>
        )}
      </div>
    </GamePanel>
  );
}

function StatsGrid({ stats }: { stats: MyStatsData | null }) {
  const s = stats;
  return (
    <GamePanel variant="default" eyebrow="// ESTATÍSTICAS">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 sm:grid-cols-4">
        <Stat label="Partidas Ranqueadas" value={String(s?.rankedMatches ?? 0)} />
        <Stat label="Vitórias" value={String(s?.wins ?? 0)} />
        <Stat label="Derrotas" value={String(s?.losses ?? 0)} />
        <Stat label="Taxa de Vitória" value={`${(s?.winRate ?? 0).toFixed(1)}%`} />
        <Stat label="Melhor Rating" value={String(s?.peakRating ?? 500)} />
        <Stat label="Sequência Atual" value={String(s?.winStreak ?? 0)} />
        <Stat label="Melhor Sequência" value={String(s?.bestWinStreak ?? 0)} />
        <Stat label="Tempo Total de Batalha" value={formatTotalPlayTime(s?.totalPlayTimeMs ?? 0)} />
        <Stat
          label="Vitória Mais Rápida"
          value={s?.fastestVictoryMs != null ? formatClock(s.fastestVictoryMs) : "—"}
        />
        <Stat label="Como Azul" value={`${s?.blueWins ?? 0}V / ${s?.blueLosses ?? 0}D`} />
        <Stat label="Como Vermelho" value={`${s?.redWins ?? 0}V / ${s?.redLosses ?? 0}D`} />
      </div>
    </GamePanel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded border border-border/30 bg-background/30 py-3 text-center">
      <span className="font-display text-lg font-bold text-foreground">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
    </div>
  );
}

function HistorySection({ matches }: { matches: MatchHistoryEntry[] | null }) {
  if (matches === null) {
    return (
      <GamePanel variant="default" eyebrow="// HISTÓRICO DE BATALHAS">
        <p className="py-4 text-center text-xs uppercase tracking-[0.1em] text-muted-foreground">
          Carregando histórico...
        </p>
      </GamePanel>
    );
  }

  if (matches.length === 0) {
    return (
      <GamePanel variant="default" eyebrow="// HISTÓRICO DE BATALHAS">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
            Nenhuma batalha registrada
          </p>
          <p className="max-w-md text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Seu histórico de combate aparecerá aqui após sua primeira partida.
          </p>
        </div>
      </GamePanel>
    );
  }

  return (
    <GamePanel variant="default" eyebrow="// HISTÓRICO DE BATALHAS">
      <div className="flex flex-col divide-y divide-border/20">
        {matches.map((match) => (
          <MatchRow key={match.matchId} match={match} />
        ))}
      </div>
    </GamePanel>
  );
}

function MatchRow({ match }: { match: MatchHistoryEntry }) {
  const isVictory = match.result === "victory";
  const accent = isVictory ? "text-cyan-300" : "text-rose-400";
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`font-display text-sm font-bold uppercase tracking-[0.1em] ${accent}`}>
            {isVictory ? "Vitória" : "Derrota"}
          </span>
          <StatusBadge color={match.matchType === "ranked" ? "yellow" : "gray"} label={match.matchType === "ranked" ? "Ranqueada" : "Casual"} />
          {match.finishReason === "forfeit" && <StatusBadge color="gray" label="W.O." />}
        </div>
        <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
          vs {match.opponentNickname}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        {match.matchType === "ranked" && typeof match.ratingChange === "number" ? (
          <span className={`font-display text-sm font-bold ${match.ratingChange >= 0 ? "text-cyan-300" : "text-rose-400"}`}>
            {match.ratingChange >= 0 ? "+" : ""}
            {match.ratingChange} Rating
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Rating não alterado</span>
        )}
        <span className="font-display text-xs text-foreground">{formatClock(match.durationMs)}</span>
        <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {formatTimeAgo(match.finishedAt)}
        </span>
      </div>
    </div>
  );
}
