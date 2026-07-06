import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { flowState } from "@/services/flowState";

export const Route = createFileRoute("/online-lobby")({
  head: () => ({ meta: [{ title: "Sala Online — Conflito" }] }),
  component: OnlineLobbyPage,
});

function OnlineLobbyPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const session = AuthClient.readSession();

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    const client = ensureConnected();
    return client.onEvent((event) => {
      if (event.type === "RoomCreated" || event.type === "RoomJoined") {
        flowState.write({ onlineRoomId: event.roomId, onlineOwner: event.you.owner });
        navigate({ to: "/waiting-room" });
      }
      if (event.type === "ActionRejected") setError(event.reason);
      if (event.type === "AuthError") setError(event.reason);
    });
  }, [navigate, session]);

  if (!session) return null;

  return (
    <ScreenShell
      eyebrow={`// COMANDANTE ${session.profile.nickname.toUpperCase()}`}
      title="SALA ONLINE"
      subtitle="Crie uma sala ou entre com um código."
      backTo="/mode"
      backLabel="← Modo"
    >
      <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
        <GamePanel variant="blue" eyebrow="// NOVA PARTIDA" title="Criar Sala">
          <p className="mb-4 text-sm text-muted-foreground">
            Cria uma sala nova e aguarda um adversário entrar.
          </p>
          <GameButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => ensureConnected().send({ type: "CreateRoom" })}
          >
            Criar Sala
          </GameButton>
        </GamePanel>

        <GamePanel variant="default" eyebrow="// CÓDIGO DE CONVITE" title="Entrar em Sala">
          <p className="mb-4 text-sm text-muted-foreground">
            Digite o código de uma sala já criada.
          </p>
          <Input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Código da sala"
            className="mb-4"
          />
          <GameButton
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={!roomCode.trim()}
            onClick={() => ensureConnected().send({ type: "JoinRoom", roomId: roomCode.trim() })}
          >
            Entrar
          </GameButton>
        </GamePanel>
      </div>

      {error && (
        <div className="mt-6 flex justify-center">
          <StatusBadge color="red" label={error} />
        </div>
      )}
    </ScreenShell>
  );
}
