import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { flowState } from "@/services/flowState";
import { useMenuMusic } from "@/hooks/useMenuMusic";
import type { RoomPlayerInfo, RoomStatus } from "@/multiplayer/protocol";
import type { MatchType } from "@/types/ranking";
import type { Pace } from "@/types/gameState";
import { PACE_NAMES, armySize, formatFor } from "@/services/battleFormat";

export const Route = createFileRoute("/waiting-room")({
  head: () => ({ meta: [{ title: "Sala de Espera — Conflito" }] }),
  component: WaitingRoomPage,
});

function WaitingRoomPage() {
  const navigate = useNavigate();
  useMenuMusic();
  const session = AuthClient.readSession();
  const flow = flowState.read();

  const [, setStatus] = useState<RoomStatus>("waiting");
  const [players, setPlayers] = useState<RoomPlayerInfo[]>([]);
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [iAmReady, setIAmReady] = useState(false);
  // Sprint RANKING-03 — Fase 4. Vem do `RoomStateChanged` — mesmo
  // `matchType` de sempre, agora exposto aqui também.
  const [matchType, setMatchType] = useState<MatchType>("casual");
  const [pace, setPace] = useState<Pace>(flow.pace ?? "classic");

  useEffect(() => {
    if (!session || !flow.onlineRoomId) {
      navigate({ to: "/online-lobby" });
      return;
    }
    const client = ensureConnected();
    return client.onEvent((event) => {
      if (event.type === "RoomStateChanged" && event.roomId === flow.onlineRoomId) {
        setStatus(event.status);
        setPlayers(event.players);
        setReadyIds(event.readyPlayerIds);
        setMatchType(event.matchType);
        setPace(event.pace);
        flowState.write({ pace: event.pace }); // o posicionamento e a partida usam o modo da sala
        if (event.status === "deployment") {
          // Sprint TIMER-01 — grava o prazo em flowState antes de navegar:
          // este `RoomStateChanged` é único, e o listener de
          // `deployment.tsx` só existe depois que a página montar.
          // Sprint RANKING-03 — `onlineMatchType` grava pelo mesmo motivo.
          flowState.write({ onlineDeploymentDeadline: event.deploymentDeadline, onlineMatchType: event.matchType });
          navigate({ to: "/deployment" });
        }
      }
      if (event.type === "PlayerDisconnected") {
        setStatus("waiting");
      }
    });
  }, [navigate, session, flow.onlineRoomId]);

  if (!session || !flow.onlineRoomId) return null;

  const isFull = players.length >= 2;

  return (
    <ScreenShell
      eyebrow="// SALA DE ESPERA"
      title={`SALA ${flow.onlineRoomId.toUpperCase()}`}
      subtitle={isFull ? "Ambos conectados — confirmem quando estiverem prontos." : "Aguardando o adversário entrar..."}
      backTo="/online-lobby"
      backLabel="← Sair"
    >
      <div className="mx-auto max-w-md">
        {/* Sprint RANKING-03 — Fase 4: card informando o modo, sem
            alterar o layout existente (só uma linha nova acima do
            painel de jogadores). */}
        <div className="mb-4 flex items-center justify-center gap-2 rounded border border-border/40 bg-background/40 px-4 py-2 text-center">
          <StatusBadge color={matchType === "ranked" ? "yellow" : "gray"} label={matchType === "ranked" ? "Ranqueada" : "Casual"} />
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {matchType === "ranked" ? `Rating em disputa (${PACE_NAMES[pace]})` : "Sem alteração de Rating"}
          </span>
        </div>
        <div className="mb-4 rounded border border-border/40 bg-background/40 px-4 py-2 text-center text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {PACE_NAMES[pace]} · {armySize(formatFor(pace))} peças · tabuleiro {formatFor(pace).rows}×{formatFor(pace).cols}
        </div>

        <GamePanel variant="blue" eyebrow="// JOGADORES" title="Comandantes na Sala">
          <div className="space-y-3">
            {[0, 1].map((slot) => {
              const player = players[slot];
              const ready = player ? readyIds.includes(player.playerId) : false;
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0"
                >
                  <span className="text-sm uppercase tracking-[0.1em] text-foreground">
                    {player ? `${player.playerName} (${player.owner === "blue" ? "Azul" : "Vermelho"})` : "Aguardando..."}
                  </span>
                  {player && (
                    <StatusBadge color={ready ? "green" : "yellow"} label={ready ? "Pronto" : "Conectado"} />
                  )}
                </div>
              );
            })}
          </div>

          <GameButton
            variant={iAmReady ? "disabled" : "primary"}
            size="lg"
            className="mt-6 w-full"
            disabled={!isFull || iAmReady}
            onClick={() => {
              setIAmReady(true);
              ensureConnected().send({ type: "PlayerReady" });
            }}
          >
            {iAmReady ? "Aguardando adversário..." : "Pronto ▶"}
          </GameButton>
        </GamePanel>
      </div>
    </ScreenShell>
  );
}
