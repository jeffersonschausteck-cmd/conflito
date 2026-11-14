import { useEffect, useRef, useState } from "react";
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
import { useCountdown } from "@/hooks/useClock";
import { formatClock } from "@/lib/formatClock";
import type { MatchType } from "@/types/ranking";
import type { Pace } from "@/types/gameState";
import { BATTLE_FORMATS, PACE_NAMES, armySize } from "@/services/battleFormat";
import { MapPreview } from "@/components/MapPreview";
import { THEMES, mapsForPace, type ThemeId } from "@/maps";

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
  // Mapa da sala (docs/19-Mapas.md): escolhe-se o cenário; ao trocar o modo, o mesmo cenário continua escolhido.
  const [theme, setTheme] = useState<ThemeId>("planicie");
  const maps = mapsForPace(pace);
  const chosenMap = maps.find((m) => m.theme === theme) ?? maps[0];
  // Buscar partida ranqueada (docs/10-Multiplayer.md): modo da busca e prazo (epoch ms) até jogar contra o computador.
  const [searchPace, setSearchPace] = useState<Pace>("classic");
  const [searchDeadline, setSearchDeadline] = useState<number | null>(null);
  const searchingRef = useRef(false);
  searchingRef.current = searchDeadline !== null;
  const searchLeftMs = useCountdown(searchDeadline);

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
    const offEvents = client.onEvent((event) => {
      if (event.type === "PlayerConnected") {
        client.send({ type: "ResumeSession", token: session.token });
      }
      if (event.type === "MatchSearchStarted") {
        setError(null);
        setSearchDeadline(event.deadline);
      }
      if (event.type === "MatchSearchCancelled") setSearchDeadline(null);
      if (event.type === "RoomCreated" || event.type === "RoomJoined") {
        setSearchDeadline(null);
        // O modo da sala vale também para o posicionamento e a partida (e substitui o de uma partida offline antiga).
        flowState.write({ onlineRoomId: event.roomId, onlineOwner: event.you.owner, pace: event.pace, mapId: event.mapId });
        navigate({ to: "/waiting-room" });
      }
      if (event.type === "ActionRejected") {
        setSearchDeadline(null);
        setError(event.reason);
      }
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
    return () => {
      offEvents();
      // Saiu da tela no meio da busca: tira o jogador da fila.
      if (searchingRef.current) {
        try {
          client.send({ type: "CancelFindMatch" });
        } catch {
          // sem conexão: o servidor já tira da fila quando o socket cai
        }
      }
    };
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

      <div className="mx-auto mb-6 max-w-2xl">
        <GamePanel variant="blue" eyebrow="// RANQUEADA" title="Buscar Partida">
          <p className="mb-3 text-sm text-muted-foreground">
            O servidor procura um adversário do mesmo modo. Se ninguém aparecer em 4 minutos, você joga contra um adversário controlado pelo computador. A partida vale pontos do mesmo jeito.
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(["blitz", "rapid", "classic"] as const).map((id) => {
              const f = BATTLE_FORMATS[id];
              return (
                <button
                  key={id}
                  type="button"
                  disabled={searchDeadline !== null}
                  onClick={() => setSearchPace(id)}
                  className={`rounded border p-2 text-left transition-colors disabled:opacity-60 ${
                    searchPace === id ? "border-cyan-400/70 bg-cyan-500/10" : "border-border/40 bg-transparent hover:border-border"
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-foreground">{PACE_NAMES[id].replace("Partida ", "")}</div>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                    {armySize(f)} peças · {f.rows}×{f.cols}
                  </p>
                </button>
              );
            })}
          </div>
          {searchDeadline === null ? (
            <GameButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                setError(null);
                ensureConnected().send({ type: "FindRankedMatch", pace: searchPace });
              }}
            >
              Buscar adversário
            </GameButton>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="font-display text-xs uppercase tracking-[0.2em] text-cyan-300" role="status">
                Procurando um adversário… {formatClock(Math.max(0, 4 * 60_000 - searchLeftMs))}
              </p>
              <GameButton variant="secondary" size="md" onClick={() => ensureConnected().send({ type: "CancelFindMatch" })}>
                Cancelar
              </GameButton>
            </div>
          )}
        </GamePanel>
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

          {/* Mapa da sala: quem cria escolhe, e vale para os dois jogadores. */}
          <div className="mb-4">
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Mapa</div>
            <div className="grid grid-cols-3 gap-2">
              {maps.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTheme(m.theme)}
                  className={`rounded border p-1.5 text-center transition-colors ${chosenMap.id === m.id ? "bg-cyan-500/10" : "border-border/40 bg-transparent hover:border-border"}`}
                  style={chosenMap.id === m.id ? { borderColor: THEMES[m.theme].destaque } : undefined}
                  aria-pressed={chosenMap.id === m.id}
                >
                  <MapPreview map={m} className="h-14 w-full" />
                  <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-[0.04em] text-foreground">{m.nome}</div>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{THEMES[chosenMap.theme].descricao}</p>
          </div>

          <GameButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => ensureConnected().send({ type: "CreateRoom", matchType, pace, mapId: chosenMap.id })}
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
