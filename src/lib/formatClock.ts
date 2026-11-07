/**
 * Sprint TIMER-01 — formatação de tempo única do jogo ("MM:SS"),
 * usada pelo cronômetro de Posicionamento (contagem regressiva) e
 * pelo cronômetro da Partida (contagem progressiva) e pelas telas de
 * Vitória/Derrota. Nenhuma regra de jogo — só apresentação.
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Sprint RANKING-02 — Fase 7. Formato "HHh MMm" pra tempo TOTAL
 * acumulado (`PlayerStats.totalPlayTimeMs`) — diferente de
 * `formatClock` (que é "MM:SS" pra UMA partida/cronômetro). Não
 * reaproveita `formatClock` porque a unidade maior aqui é hora, não
 * minuto — formatos genuinamente diferentes, não uma duplicação.
 */
export function formatTotalPlayTime(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

/**
 * Sprint RANKING-02 — Fase 5. Data relativa curta pro Histórico de
 * Batalhas ("Há 2 horas", "Ontem"). `now` é injetável só pra teste
 * puro determinístico — em produção sempre o valor padrão (`Date.now()`).
 */
export function formatTimeAgo(finishedAt: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - finishedAt);
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  if (hours < 24) return `Há ${hours} hora${hours === 1 ? "" : "s"}`;
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  return `Há ${Math.floor(days / 7)} semana${Math.floor(days / 7) === 1 ? "" : "s"}`;
}
