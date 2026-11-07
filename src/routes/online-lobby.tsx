import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ensureConnected, getNetworkClient } from "@/multiplayer/networkSingleton";
import { AuthClient } from "@/multiplayer/AuthClient";
import { flowState } from "@/services/flowState";
import { useMenuMusic } from "@/hooks/useMenuMusic";
import type { MatchType } from "@/types/ranking";

export const Route = createFileRoute("/online-lobby")({
  head: () => ({ meta: [{ title: "Sala Online — Conflito" }] }),
  component: OnlineLobbyPage,
});

function OnlineLobbyPage() {
  const navigate = useNavigate();
  useMenuMusic();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const session = AuthClient.readSession();
  // Sprint RANKING-03 — Fase 2/3: único campo que existe, "casual" por
  // padrão (Direcionamento Oficial já valia isso antes; agora o
  // jogador pode escolher "ranked" de propósito). Nunca criar
  // isRanked/rankMode/competitive — só este `MatchType`.
  const [matchType, setMatchType] = useState<MatchType>("casual");

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    const client = getNetworkClient();
    // Sprint QA-03 — o Lobby sempre precisa falar com a AccountsRoom, nunca
    // com a GameRoom de uma sala anterior (ver NetworkClient.ensureLobbyConnection).
    // Quando isso reconecta de fato, a conexão nasce sem autenticação — reenvia
    // o token já salvo (`ResumeSession`) para não pedir login de novo.
    client.ensureLobbyConnection();
    return client.onEvent((event) => {
      if (event.type === "PlayerConnected") {
        client.send({ type: "ResumeSession", token: session.token });
      }
      if (event.type === "RoomCreated" || event.type === "RoomJoined") {
        flowState.write({ onlineRoomId: event.roomId, onlineOwner: event.you.owner });
        navigate({ to: "/waiting-room" });
      }
      if (event.type === "ActionRejected") setError(event.reason);
      if (event.type === "AuthError") setError(event.reason);
    });
  }, [navigate, session]);

  if (!session) return null;

  const handleLogout = () => {
    const client = getNetworkClient();
    AuthClient.logout(client);
    client.disconnect();
    navigate({ to: "/login" });
  };

  return (
    <ScreenShell
      eyebrow={`// COMANDANTE ${session.profile.nickname.toUpperCase()}`}
      title="SALA ONLINE"
      subtitle="Crie uma sala ou entre com um código."
      backTo="/mode"
      backLabel="← Modo"
    >
      <div className="mx-auto mb-4 flex max-w-2xl justify-end">
        <GameButton variant="ghost" size="sm" onClick={handleLogout}>
          Sair da Conta
        </GameButton>
      </div>

      <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
        <GamePanel variant="blue" eyebrow="// NOVA PARTIDA" title="Criar Sala">
          <p className="mb-4 text-sm text-muted-foreground">
            Cria uma sala nova e aguarda um adversário entrar.
          </p>

          {/* Sprint RANKING-03 — Fase 2. Casual continua selecionado por
              padrão; a escolha vira o único `matchType` enviado no
              `CreateRoom` abaixo. */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMatchType("casual")}
              className={`rounded border p-3 text-left transition-colors ${
                matchType === "casual"
                  ? "border-cyan-400/70 bg-cyan-500/10"
                  : "border-border/40 bg-transparent hover:border-border"
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">Casual</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Treine suas estratégias. O Rating não será alterado. Resultados entram apenas no Histórico.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("ranked")}
              className={`rounded border p-3 text-left transition-colors ${
                matchType === "ranked"
                  ? "border-amber-400/70 bg-amber-500/10"
                  : "border-border/40 bg-transparent hover:border-border"
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">Ranqueada</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Seu Rating será atualizado. Resultados entram no Histórico e no Ranking.
              </p>
            </button>
          </div>

          <GameButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => ensureConnected().send({ type: "CreateRoom", matchType })}
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
