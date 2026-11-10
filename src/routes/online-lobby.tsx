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
import type { Pace } from "@/types/gameState";
import { BATTLE_FORMATS, PACE_NAMES, armySize } from "@/services/battleFormat";

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
  // Toda partida online é ranqueada (docs/16 - Sistema de Contas, "Sem casual").
  const matchType: MatchType = "ranked";
  // Modo da sala: tamanho do tabuleiro e do exército. A ranqueada é separada por modo.
  const [pace, setPace] = useState<Pace>("classic");

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
        // O modo da sala vale também para o posicionamento e a partida (e substitui o de uma partida offline antiga).
        flowState.write({ onlineRoomId: event.roomId, onlineOwner: event.you.owner, pace: event.pace });
        navigate({ to: "/waiting-room" });
      }
      if (event.type === "ActionRejected") setError(event.reason);
      if (event.type === "AuthError") {
        // Sessão que o servidor não reconhece mais: descarta e pede um novo login.
        if (/Sessão expirada|Conta não encontrada/i.test(event.reason)) {
          AuthClient.clearSession();
          navigate({ to: "/login" });
          return;
        }
        setError(event.reason);
      }
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

          <div className="mb-4 flex items-center gap-2 rounded border border-amber-400/40 bg-amber-500/10 px-3 py-2">
            <StatusBadge color="yellow" label="Ranqueada" />
            <span className="text-xs text-muted-foreground">Toda partida online vale pontos no ranking do modo escolhido.</span>
          </div>

          {/* Modo da sala: define o tabuleiro e o exército. Cada modo tem a sua própria ranqueada. */}
          <div className="mb-4">
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Modo</div>
            <div className="grid grid-cols-3 gap-2">
              {(["blitz", "rapid", "classic"] as const).map((id) => {
                const f = BATTLE_FORMATS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPace(id)}
                    className={`rounded border p-2 text-left transition-colors ${
                      pace === id ? "border-cyan-400/70 bg-cyan-500/10" : "border-border/40 bg-transparent hover:border-border"
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-foreground">{PACE_NAMES[id].replace("Partida ", "")}</div>
                    <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                      {armySize(f)} peças
                      <br />
                      {f.rows}×{f.cols}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-amber-200/80">Vale pontos só no ranking da {PACE_NAMES[pace]}.</p>
          </div>

          <GameButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => ensureConnected().send({ type: "CreateRoom", matchType, pace })}
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
