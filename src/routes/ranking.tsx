import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ensureConnected, getNetworkClient } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { useMenuMusic } from "@/hooks/useMenuMusic";
import type { LeaderboardEntry, MyStatsData } from "@/types/ranking";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking de Comandantes — Conflito" }] }),
  component: RankingPage,
});

/**
 * Sprint RANKING-01 — Fase 11/12/13. Reusa exatamente o mesmo padrão
 * de conexão de `online-lobby.tsx` (garante a conexão de Lobby,
 * reautentica via `ResumeSession` assim que o socket abre, escuta a
 * resposta via `onEvent`) — nenhum mecanismo de rede novo, só dois
 * eventos a mais no mesmo protocolo (`GetLeaderboard`/`GetMyStats`).
 */
function RankingPage() {
  const navigate = useNavigate();
  useMenuMusic();
  const session = AuthClient.readSession();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [myStats, setMyStats] = useState<MyStatsData | null>(null);

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
        client.send({ type: "GetLeaderboard", limit: 50 });
        client.send({ type: "GetMyStats" });
      }
      if (event.type === "LeaderboardData") {
        setEntries(event.entries);
      }
      if (event.type === "MyStatsData") {
        setMyStats(event.stats);
      }
    });
  }, [navigate, session]);

  if (!session) return null;

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];
  const isLoading = entries === null;
  const isEmpty = entries !== null && entries.length === 0;

  return (
    <ScreenShell
      eyebrow="// CLASSIFICAÇÃO GLOBAL"
      title="RANKING DE COMANDANTES"
      subtitle="CLASSIFICAÇÃO GLOBAL"
      backTo="/mode"
      backLabel="← Modo"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <MyPositionCard stats={myStats} />

        {isLoading && (
          <p className="text-center text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Carregando classificação...
          </p>
        )}

        {isEmpty && <EmptySeasonState />}

        {!isLoading && !isEmpty && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {top3.map((entry) => (
                <TopEntryCard key={entry.accountId} entry={entry} />
              ))}
            </div>

            {rest.length > 0 && (
              <GamePanel variant="default" eyebrow="// CLASSIFICAÇÃO GERAL">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground uppercase tracking-[0.1em]">
                        <th className="py-2 pr-2">Pos.</th>
                        <th className="py-2 pr-2">Comandante</th>
                        <th className="py-2 pr-2">Patente</th>
                        <th className="py-2 pr-2 text-right">Rating</th>
                        <th className="py-2 pr-2 text-right">Vitórias</th>
                        <th className="py-2 pr-2 text-right">Derrotas</th>
                        <th className="py-2 text-right">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((entry) => (
                        <tr key={entry.accountId} className="border-b border-border/20 last:border-0">
                          <td className="py-2 pr-2 font-bold text-foreground">#{entry.position}</td>
                          <td className="py-2 pr-2 font-bold uppercase text-foreground">{entry.username}</td>
                          <td className="py-2 pr-2 text-muted-foreground">{entry.rankTier}</td>
                          <td className="py-2 pr-2 text-right font-bold text-cyan-300">{entry.rating}</td>
                          <td className="py-2 pr-2 text-right text-muted-foreground">{entry.wins}</td>
                          <td className="py-2 pr-2 text-right text-muted-foreground">{entry.losses}</td>
                          <td className="py-2 text-right text-muted-foreground">{entry.winRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GamePanel>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  );
}

function EmptySeasonState() {
  return (
    <GamePanel variant="blue" eyebrow="// TEMPORADA COMPETITIVA">
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
          A temporada competitiva está começando.
        </p>
        <p className="max-w-md text-xs uppercase tracking-[0.1em] text-muted-foreground">
          Seja um dos primeiros comandantes a entrar no Ranking.
        </p>
      </div>
    </GamePanel>
  );
}

function TopEntryCard({ entry }: { entry: LeaderboardEntry }) {
  const accent = entry.position === 1 ? "#FACC15" : entry.position === 2 ? "#67e8f9" : "#fb923c";
  return (
    <div
      className="flex flex-col items-center gap-1 rounded border bg-background/40 px-4 py-5 text-center backdrop-blur-sm"
      style={{ borderColor: `${accent}66`, boxShadow: `0 0 24px ${accent}22` }}
    >
      <span className="font-display text-2xl font-black" style={{ color: accent }}>
        #{entry.position}
      </span>
      <span className="font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground">
        {entry.username}
      </span>
      <StatusBadge color="blue" label={entry.rankTier} />
      <span className="font-display text-xl font-bold text-cyan-300">{entry.rating}</span>
      <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {entry.wins}V {entry.losses}D · {entry.winRate.toFixed(1)}%
      </span>
    </div>
  );
}

function MyPositionCard({ stats }: { stats: MyStatsData | null }) {
  if (!stats) {
    return (
      <GamePanel variant="default" eyebrow="// SUA POSIÇÃO">
        <p className="py-4 text-center text-xs uppercase tracking-[0.1em] text-muted-foreground">
          Carregando suas estatísticas...
        </p>
      </GamePanel>
    );
  }

  // Fase 13 — sem partida ranqueada ainda: "SEM CLASSIFICAÇÃO".
  if (stats.position === null) {
    return (
      <GamePanel variant="blue" eyebrow="// SUA POSIÇÃO">
        <div className="flex flex-col items-center gap-1 py-3 text-center">
          <StatusBadge color="yellow" label="Sem classificação" />
          <span className="font-display text-lg font-bold uppercase tracking-[0.1em] text-foreground">
            {stats.username}
          </span>
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {stats.rankTier} · Rating: {stats.rating}
          </span>
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Partidas ranqueadas: {stats.rankedMatches}
          </span>
        </div>
      </GamePanel>
    );
  }

  return (
    <GamePanel variant="blue" eyebrow="// SUA POSIÇÃO">
      <div className="flex flex-col items-center gap-1 py-3 text-center">
        <span className="font-display text-2xl font-black text-cyan-300">#{stats.position}</span>
        <span className="font-display text-lg font-bold uppercase tracking-[0.1em] text-foreground">
          {stats.username}
        </span>
        <StatusBadge color="blue" label={stats.rankTier} />
        <span className="font-display text-xl font-bold text-foreground">{stats.rating} pontos</span>
        <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {stats.wins} vitórias · {stats.losses} derrotas · {stats.winRate.toFixed(1)}% de vitórias
        </span>
      </div>
    </GamePanel>
  );
}
