import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { flowState } from "@/services/flowState";
import type { RoomPlayerInfo, RoomStatus } from "@/multiplayer/protocol";

export const Route = createFileRoute("/waiting-room")({
  head: () => ({ meta: [{ title: "Sala de Espera — Conflito" }] }),
  component: WaitingRoomPage,
});

function WaitingRoomPage() {
  const navigate = useNavigate();
  const session = AuthClient.readSession();
  const flow = flowState.read();

  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [players, setPlayers] = useState<RoomPlayerInfo[]>([]);
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [iAmReady, setIAmReady] = useState(false);

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
        if (event.status === "deployment") {
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
