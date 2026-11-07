import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PIECES } from "@/config/pieces";
import { DeploymentManager, DEPLOYMENT_DEPTH, DEPLOYMENT_DURATION_MS } from "@/services/deploymentManager";
import { theme } from "@/design/theme";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import { flowState } from "@/services/flowState";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import { serializeGameState } from "@/multiplayer/NetworkClient";
import { useMenuMusic } from "@/hooks/useMenuMusic";
import { useCountdown } from "@/hooks/useClock";
import { formatClock } from "@/lib/formatClock";
import { KayPiece } from "@/components/kay/KayCharacters";
import { BoardWorld, Board3DCanvas, cellWorld, useDeviceMode } from "@/components/kay/BoardWorld";
import type { Piece as PieceModel, PieceType, PlayerOwner } from "@/types/piece";
import type { MatchType } from "@/types/ranking";

export const Route = createFileRoute("/deployment")({
  head: () => ({
    meta: [{ title: "Fase de Posicionamento — Conflito" }],
  }),
  component: DeploymentPage,
});

// ─── Constants ───────────────────────────────────────────────────────────────

const PIECE_TYPES_ORDER: PieceType[] = [
  "commander",
  "officer",
  "sniper",
  "engineer",
  "infantry",
  "scout",
  "spy",
  "bomb",
  "flag",
];

// Nomes, quantidades e forças vêm de PIECES (fonte única — Documento 06).
// Nenhum valor é redigitado aqui para evitar divergência.
const PIECE_NAMES: Record<PieceType, string> = Object.fromEntries(
  PIECE_TYPES_ORDER.map((type) => [type, PIECES[type].nome]),
) as Record<PieceType, string>;

const PIECE_LIMITS: Record<PieceType, number> = Object.fromEntries(
  PIECE_TYPES_ORDER.map((type) => [type, PIECES[type].quantidade]),
) as Record<PieceType, number>;

function getRankForType(type: PieceType): number {
  return PIECES[type].patente ?? 0;
}

// ─── DeploymentPage ──────────────────────────────────────────────────────────

function DeploymentPage() {
  const navigate = useNavigate();
  useMenuMusic();
  const { mounted, phone, portrait, aspect } = useDeviceMode();

  const flow = flowState.read();
  const isOnline = flow.online === true;
  // Sprint MP-02: online, o jogador pode ter sido designado Vermelho
  // (segundo a entrar na sala) — offline, é sempre Azul, como sempre foi.
  const myOwner: PlayerOwner = isOnline ? flow.onlineOwner ?? "blue" : "blue";
  const [waitingOpponent, setWaitingOpponent] = useState(false);

  // Sprint TIMER-01 — prazo (epoch ms) do cronômetro de Posicionamento.
  // Offline: definido uma única vez, aqui mesmo, no instante em que a
  // tela monta — não há servidor pra ser autoridade, então o cliente é
  // a única fonte (comportamento idêntico, só sem sincronização entre
  // dois jogadores porque offline não tem um segundo jogador).
  // Online: começa `null` e só é preenchido quando o servidor manda o
  // `RoomStateChanged` com `deploymentDeadline` — nunca calculado
  // localmente, pra garantir que os dois jogadores vejam exatamente o
  // mesmo relógio.
  const [deploymentDeadline] = useState<number | null>(() =>
    flowState.read().online === true ? null : Date.now() + DEPLOYMENT_DURATION_MS,
  );
  // Sprint TIMER-01 — valor inicial vem de `flowState` (gravado por
  // `waiting-room.tsx` antes de navegar pra cá), porque o
  // `RoomStateChanged` que carrega o prazo é um evento único que já
  // foi consumido antes desta página montar. `onEvent` abaixo continua
  // ouvindo por precaução, mas normalmente não haverá um segundo disparo.
  const [onlineDeploymentDeadline, setOnlineDeploymentDeadline] = useState<number | null>(
    () => flowState.read().onlineDeploymentDeadline ?? null,
  );
  const effectiveDeadline = isOnline ? onlineDeploymentDeadline : deploymentDeadline;
  const remainingMs = useCountdown(effectiveDeadline);
  const autoSubmittedRef = useRef(false);

  // Sprint RANKING-03 — Fase 5. Mesmo `matchType` de sempre; mesmo
  // padrão de `onlineDeploymentDeadline` acima (valor inicial de
  // `flowState`, gravado por `waiting-room.tsx` antes de navegar pra
  // cá; `RoomStateChanged` abaixo mantém atualizado por precaução).
  // Offline sempre "casual" (não existe conceito de Rating sem servidor).
  const [matchType, setMatchType] = useState<MatchType>(
    () => flowState.read().onlineMatchType ?? "casual",
  );

  const [pieces, setPieces] = useState<PieceModel[]>(() =>
    DeploymentManager.createDefaultPlayerDeployment(ACTIVE_MAP.rows, ACTIVE_MAP.cols, myOwner)
  );
  const [selectedBoardPieceId, setSelectedBoardPieceId] = useState<string | null>(null);
  const [selectedTrayPieceType, setSelectedTrayPieceType] = useState<PieceType | null>(null);

  const rows = ACTIVE_MAP.rows;
  const cols = ACTIVE_MAP.cols;
  const blockedTiles = useMemo(() => getBlockedTiles(ACTIVE_MAP), []);

  // Sprint 2.5: Azul posiciona à esquerda, Vermelho à direita. A zona do
  // jogador acompanha `myOwner` (Sprint MP-02) para funcionar dos dois
  // lados no modo online; offline continua sempre a zona da esquerda.
  const playerZoneStart = myOwner === "blue" ? 0 : Math.max(0, cols - DEPLOYMENT_DEPTH);
  const playerZoneEnd = myOwner === "blue" ? DEPLOYMENT_DEPTH : cols;
  const enemyZoneStart = myOwner === "blue" ? Math.max(DEPLOYMENT_DEPTH, cols - DEPLOYMENT_DEPTH) : 0;
  const enemyZoneEndExclusive = myOwner === "blue" ? cols : Math.min(DEPLOYMENT_DEPTH, cols);

  useEffect(() => {
    if (!isOnline) return;
    const client = ensureConnected();
    return client.onEvent((event) => {
      if (event.type === "RoomStateChanged") {
        // Sprint TIMER-01 — única fonte do prazo de Posicionamento
        // online: o servidor manda o mesmo valor pros dois jogadores
        // (`GameRoom.markReady`), nunca recalculado no cliente.
        setOnlineDeploymentDeadline(event.deploymentDeadline);
        // Sprint RANKING-03 — mesmo motivo, mesmo campo de sempre.
        setMatchType(event.matchType);
      }
      if (event.type === "GameStarted") {
        if (typeof window !== "undefined") {
          // Sprint QA-11 — `event.state` já chega rehidratado (blockedTiles
          // como Set) pelo NetworkClient; nunca serializar isso direto,
          // senão o Set vira "{}" no JSON. `game.tsx` reconstrói o Set de
          // volta via `rehydrateGameState`.
          // Sprint TIMER-01 — `matchStartTime` viaja junto (fora do
          // `GameState`, mesmo padrão de `localOwner`/QA-13: tempo é meta
          // de orquestração, não dado do Motor) pra `game.tsx` repassar
          // ao cronômetro da Partida.
          // Sprint RANKING-03 — `matchType` viaja junto pelo mesmo
          // motivo, pra HUD/tela final saberem CASUAL vs RANQUEADA sem
          // recalcular nada.
          window.sessionStorage.setItem(
            "conflito:online-state",
            JSON.stringify({
              state: serializeGameState(event.state),
              matchStartTime: event.matchStartTime,
              matchType: event.matchType,
            }),
          );
        }
        navigate({ to: "/game" });
      }
      if (event.type === "ActionRejected") {
        setWaitingOpponent(false);
      }
    });
  }, [isOnline, navigate]);

  const trayCounts = useMemo(() => {
    const counts = { ...PIECE_LIMITS };
    pieces.forEach((p) => {
      if (p.currentRow !== -1) {
        counts[p.pieceType] = Math.max(0, counts[p.pieceType] - 1);
      }
    });
    return counts;
  }, [pieces]);

  const piecesRemaining = useMemo(
    () => pieces.filter((p) => p.currentRow === -1).length,
    [pieces]
  );

  const isReady = useMemo(
    () => DeploymentManager.validateDeployment(pieces, rows, cols, blockedTiles, myOwner),
    [pieces, rows, cols, blockedTiles, myOwner]
  );

  const selectedBoardPiece = useMemo(
    () => pieces.find((p) => p.id === selectedBoardPieceId) || null,
    [pieces, selectedBoardPieceId]
  );

  // ── Handlers (game logic unchanged) ────────────────────────────────────────

  const handleCellClick = (r: number, c: number) => {    if (c < playerZoneStart || c >= playerZoneEnd) return;
    if (blockedTiles.has(`${r}-${c}`)) return;

    const existingPiece = pieces.find(
      (p) => p.currentRow === r && p.currentColumn === c
    );

    if (selectedTrayPieceType) {
      const remaining = trayCounts[selectedTrayPieceType];
      if (
        remaining <= 0 &&
        (!existingPiece || existingPiece.pieceType !== selectedTrayPieceType)
      ) {
        setSelectedTrayPieceType(null);
        return;
      }

      let updatedPieces = [...pieces];
      if (existingPiece) {
        updatedPieces = updatedPieces.map((p) =>
          p.id === existingPiece.id
            ? { ...p, currentRow: -1, currentColumn: -1 }
            : p
        );
      }

      const unplacedIndex = updatedPieces.findIndex(
        (p) => p.pieceType === selectedTrayPieceType && p.currentRow === -1
      );

      if (unplacedIndex !== -1) {
        updatedPieces[unplacedIndex] = {
          ...updatedPieces[unplacedIndex],
          currentRow: r,
          currentColumn: c,
        };
        setPieces(updatedPieces);
      }

      if (
        trayCounts[selectedTrayPieceType] <= 1 &&
        (!existingPiece || existingPiece.pieceType !== selectedTrayPieceType)
      ) {
        setSelectedTrayPieceType(null);
      }
      return;
    }

    if (selectedBoardPieceId) {
      if (existingPiece && existingPiece.id === selectedBoardPieceId) {
        setSelectedBoardPieceId(null);
        return;
      }

      const updatedPieces = pieces.map((p) => {
        if (p.id === selectedBoardPieceId) {
          return { ...p, currentRow: r, currentColumn: c };
        }
        if (existingPiece && p.id === existingPiece.id) {
          const activePiece = pieces.find((ap) => ap.id === selectedBoardPieceId);
          return {
            ...p,
            currentRow: activePiece ? activePiece.currentRow : -1,
            currentColumn: activePiece ? activePiece.currentColumn : -1,
          };
        }
        return p;
      });

      setPieces(updatedPieces);
      setSelectedBoardPieceId(null);
      return;
    }

    if (existingPiece) {
      setSelectedBoardPieceId(existingPiece.id);
      setSelectedTrayPieceType(null);
    }
  };

  const handlePieceClick = (piece: PieceModel) => {
    handleCellClick(piece.currentRow, piece.currentColumn);
  };

  const handleTrayPieceSelect = (type: PieceType) => {
    if (trayCounts[type] <= 0) return;
    setSelectedTrayPieceType(type === selectedTrayPieceType ? null : type);
    setSelectedBoardPieceId(null);
  };

  const handleReset = () => {
    const updated = pieces.map((p) => ({
      ...p,
      currentRow: -1,
      currentColumn: -1,
    }));
    setPieces(updated);
    setSelectedBoardPieceId(null);
    setSelectedTrayPieceType(null);
  };

  const handleAutoFill = () => {
    setPieces(DeploymentManager.createDefaultPlayerDeployment(rows, cols, myOwner));
    setSelectedBoardPieceId(null);
    setSelectedTrayPieceType(null);
  };

  const handleRecallSelected = () => {
    if (!selectedBoardPieceId) return;
    const updated = pieces.map((p) =>
      p.id === selectedBoardPieceId ? { ...p, currentRow: -1, currentColumn: -1 } : p
    );
    setPieces(updated);
    setSelectedBoardPieceId(null);
  };

  // Sprint TIMER-01 — núcleo único de confirmação, usado tanto pelo
  // clique manual em "Iniciar Batalha" quanto pelo estouro do
  // cronômetro. Recebe `finalPieces` explicitamente (em vez de ler
  // `pieces` do estado do componente) porque o auto-envio por timeout
  // pode precisar completar posições vazias no mesmo instante — ler
  // `pieces` direto arriscaria um valor desatualizado da mesma
  // renderização (closure obsoleta).
  const submitDeployment = (finalPieces: PieceModel[]) => {
    if (isOnline) {
      // Sprint MP-02: o servidor mescla os dois lados e só inicia a
      // partida quando ambos confirmarem (Room.confirmDeployment).
      setWaitingOpponent(true);
      ensureConnected().send({ type: "ConfirmDeployment", pieces: finalPieces });
      return;
    }

    const aiPieces = DeploymentManager.generateAIDeployment(rows, cols, blockedTiles);
    const finalWithAI = [...finalPieces, ...aiPieces];
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("psc:initial-pieces", JSON.stringify(finalWithAI));
    }
    navigate({ to: "/game" });
  };

  const handleConfirm = () => {
    if (!isReady) return;
    submitDeployment(pieces);
  };

  // Sprint TIMER-01 — quando o cronômetro chega a zero, confirma a
  // formação atual automaticamente (completando com o mesmo
  // posicionamento padrão usado no botão "Posicionar Automaticamente"
  // se ainda houver peça sem lugar) — nunca cancela, nunca mostra
  // erro, nunca volta ao Lobby. `autoSubmittedRef` garante um único
  // envio mesmo que o efeito rode de novo antes da navegação.
  useEffect(() => {
    if (effectiveDeadline === null) return;
    if (remainingMs > 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;

    const finalPieces = DeploymentManager.validateDeployment(pieces, rows, cols, blockedTiles, myOwner)
      ? pieces
      : DeploymentManager.createDefaultPlayerDeployment(rows, cols, myOwner);
    submitDeployment(finalPieces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, effectiveDeadline]);

  const teamColor = myOwner === "blue" ? "#22d3ee" : "#fb7185";
  const enemyColor = myOwner === "blue" ? "#fb7185" : "#22d3ee";
  const trayTypes = PIECE_TYPES_ORDER.filter((t) => trayCounts[t] > 0);

  // ── Peças da reserva (usadas na lateral do computador e na faixa do celular) ──
  const trayItems = trayTypes.map((type) => {
    const isSelected = selectedTrayPieceType === type;
    const rank = getRankForType(type);
    return (
      <button
        key={`tray-${type}`}
        onClick={() => handleTrayPieceSelect(type)}
        className={`pointer-events-auto flex shrink-0 items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
          isSelected ? "border-cyan-300 bg-cyan-400/20 shadow-[0_0_14px_rgba(34,211,238,0.45)]" : "border-white/10 bg-slate-900/70 hover:border-cyan-400/50"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black text-white" style={{ borderColor: teamColor, background: `${teamColor}33` }}>
          {rank > 0 ? rank : PIECE_NAMES[type].slice(0, 1)}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-[11px] font-bold uppercase tracking-wider text-white">{PIECE_NAMES[type]}</span>
          <span className="block text-[10px] text-slate-400">x{trayCounts[type]}</span>
        </span>
      </button>
    );
  });

  const confirmLabel = waitingOpponent ? "Aguardando…" : "Iniciar batalha";
  const actionButtons = (
    <div className="pointer-events-auto flex items-stretch gap-1.5 [@media(max-height:500px)]:w-[44%] [@media(max-height:500px)]:shrink-0">
      <button onClick={handleAutoFill} className="flex-1 rounded border border-cyan-400/40 bg-slate-900/80 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-cyan-100 active:bg-cyan-400/20">
        Auto
      </button>
      <button onClick={handleReset} className="flex-1 rounded border border-rose-400/40 bg-slate-900/80 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-rose-100 active:bg-rose-400/20">
        Limpar
      </button>
      <button
        onClick={handleConfirm}
        disabled={!isReady || waitingOpponent}
        className="flex-[2] rounded border border-amber-300 bg-gradient-to-b from-amber-500 to-amber-700 px-3 py-2 font-display text-[12px] font-black uppercase tracking-wider text-white shadow-[0_0_14px_rgba(251,191,36,0.4)] disabled:border-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400 disabled:shadow-none"
      >
        {confirmLabel} ▶
      </button>
    </div>
  );

  const selectedCard = selectedBoardPiece && (
    <div className="pointer-events-auto flex items-center justify-between gap-2 rounded border border-cyan-400/40 bg-slate-900/80 px-2.5 py-1.5">
      <span className="font-display text-[11px] font-bold uppercase tracking-wider text-white">
        {PIECE_NAMES[selectedBoardPiece.pieceType]} <span className="text-slate-400">· patente {selectedBoardPiece.rank}</span>
      </span>
      <button onClick={handleRecallSelected} className="rounded border border-rose-400/50 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-rose-100">
        Voltar à reserva
      </button>
    </div>
  );

  const status = (
    <div className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider">
      <span className={`rounded px-2 py-0.5 ${isReady ? "bg-emerald-500/25 text-emerald-200" : "bg-rose-500/25 text-rose-200"}`}>{isReady ? "Formação pronta" : "Formação incompleta"}</span>
      <span className="rounded bg-sky-500/25 px-2 py-0.5 text-sky-100">{piecesRemaining} / 40 restantes</span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950 text-foreground">
      {/* Tabuleiro 3D em tela cheia, atrás do HUD (mesmo visual da partida) */}
      {mounted && (
        <div className={`absolute inset-0 z-0 ${phone ? "touch-none" : ""}`}>
          <Board3DCanvas phone={phone} portrait={portrait} aspect={aspect} focusX={myOwner === "blue" ? -5 : 5}>
            <Suspense fallback={null}>
              <DeploymentScene
                flat={phone}
                pieces={pieces}
                myOwner={myOwner}
                selectedBoardPieceId={selectedBoardPieceId}
                zone={{ start: playerZoneStart, end: playerZoneEnd }}
                enemyZone={{ start: enemyZoneStart, end: enemyZoneEndExclusive }}
                blockedTiles={blockedTiles}
                teamColor={teamColor}
                enemyColor={enemyColor}
                onCell={handleCellClick}
                onPiece={handlePieceClick}
              />
            </Suspense>
          </Board3DCanvas>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* ───── Topo ───── */}
        <div data-phone-hud="top" className="flex items-center justify-between gap-2 px-2.5 pt-2">
          <button
            onClick={() => navigate({ to: "/" })}
            className="pointer-events-auto flex h-10 shrink-0 items-center gap-1 rounded border border-rose-400/50 bg-slate-950/80 px-2 font-display text-[10px] font-bold uppercase tracking-wider text-rose-100"
          >
            ⛔ Cancelar
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center leading-tight">
            <span className="bg-gradient-to-b from-white to-slate-400 bg-clip-text font-display text-[15px] font-black uppercase tracking-[0.06em] text-transparent sm:text-lg sm:tracking-[0.18em] drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">Posicionamento</span>
            <span className="truncate font-display text-[9px] uppercase tracking-wider text-slate-300 sm:text-[10px]">
              Facção {myOwner === "blue" ? "Azul" : "Vermelha"} · {matchType === "ranked" ? "Ranqueada" : "Casual"}
            </span>
          </div>
          {effectiveDeadline !== null ? <DeploymentTimerBadge remainingMs={remainingMs} /> : <span className="w-10" />}
        </div>

        {/* ───── Base: reserva em faixa, status e botões (celular e computador) ───── */}
        <div data-phone-hud="bottom" className="mx-auto mb-2.5 flex w-[calc(100%-1.25rem)] max-w-[920px] flex-col gap-1.5 rounded-lg border border-cyan-400/30 bg-slate-950/85 p-2 backdrop-blur-sm [@media(max-height:500px)]:mb-1.5 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-center [@media(max-height:500px)]:p-1.5">
          {selectedCard}
          <div className="flex items-center justify-between [@media(max-height:500px)]:hidden">{status}</div>
          <div className="pointer-events-auto flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {piecesRemaining === 0 ? <span className="px-1 py-2 text-[11px] text-slate-300">✓ Todas posicionadas. Toque numa peça no mapa para reorganizar.</span> : trayItems}
          </div>
          {actionButtons}
        </div>
      </div>
    </main>
  );
}

// ─── Cena 3D do posicionamento ──────────────────────────────────────────────

/** Casa colorida e translúcida: mostra de quem é cada zona. Só visual. */
function ZoneMark({ x, z, color, opacity }: { x: number; z: number; color: string; opacity: number }) {
  return (
    <mesh position={[x, 0.12, z]}>
      <cylinderGeometry args={[0.9, 0.9, 0.02, 6]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function DeploymentScene({
  flat,
  pieces,
  myOwner,
  selectedBoardPieceId,
  zone,
  enemyZone,
  blockedTiles,
  teamColor,
  enemyColor,
  onCell,
  onPiece,
}: {
  flat: boolean;
  pieces: PieceModel[];
  myOwner: PlayerOwner;
  selectedBoardPieceId: string | null;
  zone: { start: number; end: number };
  enemyZone: { start: number; end: number };
  blockedTiles: ReadonlySet<string>;
  teamColor: string;
  enemyColor: string;
  onCell: (row: number, col: number) => void;
  onPiece: (piece: PieceModel) => void;
}) {
  const placed = pieces.filter((p) => p.currentRow !== -1);
  const taken = new Set(placed.map((p) => `${p.currentRow}-${p.currentColumn}`));
  const marks: { key: string; x: number; z: number; color: string; opacity: number }[] = [];
  for (let r = 0; r < ACTIVE_MAP.rows; r++) {
    for (let c = 0; c < ACTIVE_MAP.cols; c++) {
      if (blockedTiles.has(`${r}-${c}`)) continue;
      const mine = c >= zone.start && c < zone.end;
      const theirs = c >= enemyZone.start && c < enemyZone.end;
      if (!mine && !theirs) continue;
      if (mine && taken.has(`${r}-${c}`)) continue;
      const { x, z } = cellWorld(r, c);
      marks.push({ key: `${r}-${c}`, x, z, color: mine ? teamColor : enemyColor, opacity: mine ? 0.32 : 0.28 });
    }
  }
  return (
    <>
      <BoardWorld flat={flat} onSelectTile={onCell} />
      {marks.map((m) => (
        <ZoneMark key={m.key} x={m.x} z={m.z} color={m.color} opacity={m.opacity} />
      ))}
      {placed.map((p) => {
        const { x, z } = cellWorld(p.currentRow, p.currentColumn);
        return (
          <KayPiece
            key={p.id}
            x={x}
            z={z}
            owner={myOwner}
            pieceType={p.pieceType}
            color={teamColor}
            mine
            selected={p.id === selectedBoardPieceId}
            onClick={() => onPiece(p)}
          />
        );
      })}
    </>
  );
}

// ─── DeploymentTimerBadge ───────────────────────────────────────────────────

/**
 * Sprint MOBILE-01 — substitui o antigo banner gigante (`DeploymentTimerBanner`,
 * texto até `text-7xl` + padding próprio, sozinho já maior que a altura
 * inteira de uma tela de celular na horizontal) por um badge compacto
 * embutido no header. Mesma lógica de cor/pulso por fase, só a
 * apresentação muda — nunca decide prazo, nunca decide quando confirmar.
 */
function DeploymentTimerBadge({ remainingMs }: { remainingMs: number }) {
  const seconds = Math.ceil(remainingMs / 1000);
  const phase: "normal" | "warning" | "critical" = seconds <= 10 ? "critical" : seconds <= 30 ? "warning" : "normal";

  const color =
    phase === "critical" ? theme.colors.primaryRed : phase === "warning" ? "#FACC15" : theme.colors.primaryBlue;
  const glow =
    phase === "critical" ? theme.shadows.redGlowStrong : phase === "warning" ? "0 0 24px #FACC1566" : theme.shadows.blueGlowStrong;

  return (
    <div className="flex items-center gap-2 border px-2.5 py-1" style={{ borderColor: `${color}55` }}>
      <span className="font-display text-[8px] uppercase tracking-[0.25em] text-muted-foreground">
        Posicionar
      </span>
      <span
        className={`font-display text-sm font-black tabular-nums tracking-[0.05em] ${
          phase === "critical" ? "animate-pulse" : ""
        }`}
        style={{ color, textShadow: glow }}
      >
        {formatClock(remainingMs)}
      </span>
    </div>
  );
}
