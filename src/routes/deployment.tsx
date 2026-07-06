import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { Piece } from "@/components/Piece";
import { PIECES } from "@/config/pieces";
import { DeploymentManager, DEPLOYMENT_DEPTH } from "@/services/deploymentManager";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GameTooltip } from "@/components/ui/GameTooltip";
import { theme } from "@/design/theme";
import { HexBoard } from "@/components/board/hex/HexBoard";
import { HexPieceLayer } from "@/components/board/hex/HexPieceLayer";
import { ACTIVE_MAP, getBlockedTiles } from "@/maps";
import { flowState } from "@/services/flowState";
import { ensureConnected } from "@/multiplayer/networkSingleton";
import type { Piece as PieceModel, PieceType, PlayerOwner } from "@/types/piece";

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

  const flow = flowState.read();
  const isOnline = flow.online === true;
  // Sprint MP-02: online, o jogador pode ter sido designado Vermelho
  // (segundo a entrar na sala) — offline, é sempre Azul, como sempre foi.
  const myOwner: PlayerOwner = isOnline ? flow.onlineOwner ?? "blue" : "blue";
  const [waitingOpponent, setWaitingOpponent] = useState(false);

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
      if (event.type === "GameStarted") {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("conflito:online-state", JSON.stringify(event.state));
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

  const handleCellClick = (r: number, c: number) => {
    if (c < playerZoneStart || c >= playerZoneEnd) return;
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

  const handleConfirm = () => {
    if (!isReady) return;

    if (isOnline) {
      // Sprint MP-02: o servidor mescla os dois lados e só inicia a
      // partida quando ambos confirmarem (Room.confirmDeployment).
      setWaitingOpponent(true);
      ensureConnected().send({ type: "ConfirmDeployment", pieces });
      return;
    }

    const aiPieces = DeploymentManager.generateAIDeployment(rows, cols, blockedTiles);
    const finalPieces = [...pieces, ...aiPieces];
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("psc:initial-pieces", JSON.stringify(finalPieces));
    }
    navigate({ to: "/game" });
  };

  const playerZoneWidthPct = ((playerZoneEnd - playerZoneStart) / cols) * 100;
  const playerZoneLeftPct = (playerZoneStart / cols) * 100;
  const enemyZoneWidthPct = ((enemyZoneEndExclusive - enemyZoneStart) / cols) * 100;
  const enemyZoneLeftPct = (enemyZoneStart / cols) * 100;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <CyberBackground />

      {/* ── Header HUD ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between border-b border-primary/20 bg-background/40 px-6 py-3 backdrop-blur-md sm:px-10">
        <div
          className="flex items-center gap-3"
          style={{ color: myOwner === "blue" ? theme.colors.primaryBlue : theme.colors.primaryRed }}
        >
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Comandante
            </div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
              Facção {myOwner === "blue" ? "Azul" : "Vermelha"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Fase
            </div>
            <StatusBadge color="blue" label="POSICIONAMENTO" />
          </div>
        </div>

        <GameTooltip content="Return to home and cancel current mission" position="bottom">
          <GameButton
            variant="danger"
            size="sm"
            onClick={() => navigate({ to: "/" })}
          >
            ⛔ Cancelar Missão
          </GameButton>
        </GameTooltip>
      </header>

      {/* ── Sidebar + Grid ───────────────────────────────────────────────── */}
      {/* Sprint 2.5: a barra lateral fica à esquerda, ao lado da zona Azul,
          para uma transição natural entre posicionamento e partida. */}
      <section className="relative z-10 grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[360px_1fr] lg:px-8">

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-6">

          {/* Operations Panel */}
          <GamePanel variant="blue" eyebrow="// PAINEL DE OPERAÇÕES">
            <div className="space-y-3 font-display text-[10px] uppercase tracking-[0.25em]">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Status da Formação:</span>
                <StatusBadge
                  color={isReady ? "green" : "red"}
                  label={isReady ? "FORMAÇÃO PRONTA" : "INCOMPLETA"}
                />
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Unidades não posicionadas:</span>
                <StatusBadge
                  color={piecesRemaining > 0 ? "blue" : "green"}
                  label={`${piecesRemaining} / 40`}
                />
              </div>
            </div>

            {selectedBoardPiece && (
              <div
                className="mt-4 border p-3"
                style={{
                  borderColor: `${theme.colors.primaryBlue}33`,
                  background: `${theme.colors.primaryBlue}0D`,
                }}
              >
                <div
                  className="font-display text-[9px] uppercase tracking-[0.2em]"
                  style={{ color: theme.colors.primaryBlue }}
                >
                  Unidade Selecionada:
                </div>
                <div className="mt-1 font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground">
                  {PIECE_NAMES[selectedBoardPiece.pieceType]} (Patente {selectedBoardPiece.rank})
                </div>
                <GameButton
                  variant="danger"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleRecallSelected}
                >
                  Retornar à Reserva
                </GameButton>
              </div>
            )}
          </GamePanel>

          {/* Action Buttons */}
          <div className="grid gap-2">
            <GameButton
              variant={isReady && !waitingOpponent ? "primary" : "disabled"}
              size="lg"
              disabled={!isReady || waitingOpponent}
              onClick={handleConfirm}
              className="w-full"
            >
              {waitingOpponent ? "Aguardando adversário..." : "Iniciar Batalha ▶"}
            </GameButton>

            <div className="grid grid-cols-2 gap-2">
              <GameTooltip content="Posicionar automaticamente todas as unidades" position="top">
                <GameButton
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoFill}
                  className="w-full"
                >
                  Posicionar Automaticamente
                </GameButton>
              </GameTooltip>
              <GameTooltip content="Retornar todas as unidades para a reserva" position="top">
                <GameButton
                  variant="danger"
                  size="sm"
                  onClick={handleReset}
                  className="w-full"
                >
                  Limpar Posicionamento
                </GameButton>
              </GameTooltip>
            </div>
          </div>

          {/* Unit Tray */}
          <GamePanel variant="default" eyebrow="// RESERVA DE UNIDADES" className="flex-1 min-h-[300px] overflow-y-auto">
            {piecesRemaining === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <StatusBadge color="green" label="✓ Todas as unidades posicionadas" className="mb-3" />
                <div className="font-display text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Você pode reorganizar suas unidades selecionando e trocando suas posições no mapa.
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {PIECE_TYPES_ORDER.map((type) => {
                  const remaining = trayCounts[type];
                  if (remaining <= 0) return null;

                  const isSelected = selectedTrayPieceType === type;
                  const dummyPiece: PieceModel = {
                    id: `tray-preview-${type}`,
                    owner: myOwner,
                    pieceType: type,
                    rank: getRankForType(type),
                    canMove: type !== "flag" && type !== "bomb",
                    isAlive: true,
                    isRevealed: true,
                    currentRow: -1,
                    currentColumn: -1,
                  };

                  return (
                    <button
                      key={`tray-${type}`}
                      onClick={() => handleTrayPieceSelect(type)}
                      className="flex items-center gap-4 border p-2 text-left transition-all"
                      style={{
                        borderColor: isSelected
                          ? theme.colors.primaryBlue
                          : theme.colors.border,
                        background: isSelected
                          ? `${theme.colors.primaryBlue}1A`
                          : "transparent",
                        boxShadow: isSelected ? theme.shadows.blueGlow : "none",
                      }}
                    >
                      <div
                        className="h-10 w-10 flex items-center justify-center border"
                        style={{
                          background: "rgba(2,6,23,0.9)",
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Piece piece={dummyPiece} hidden={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-foreground truncate">
                          {PIECE_NAMES[type]}
                        </div>
                        <div className="font-display text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                          Rank {dummyPiece.rank > 0 ? dummyPiece.rank : "—"}
                        </div>
                      </div>
                      <StatusBadge
                        color={isSelected ? "blue" : "yellow"}
                        label={`x${remaining}`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </GamePanel>
        </aside>

        {/* ── Tactical Map ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-full">
            <HexBoard
              map={ACTIVE_MAP}
              onTileClick={handleCellClick}
              isDimmed={(_r, c) => c < playerZoneStart || c >= playerZoneEnd}
            >
              <HexPieceLayer
                pieces={pieces}
                size={42}
                selectedPieceId={selectedBoardPieceId}
                onPieceClick={handlePieceClick}
                respectFogOfWar={false}
              />
            </HexBoard>

            {/* Enemy Zone overlay — lado oposto ao do jogador (Sprint MP-02: acompanha myOwner) */}
            <div
              className="pointer-events-none absolute inset-y-3 flex flex-col items-center justify-center border backdrop-blur-[2px]"
              style={{
                left: `calc(${enemyZoneLeftPct}% + ${enemyZoneStart === 0 ? "0.75rem" : "0px"})`,
                width: `calc(${enemyZoneWidthPct}% - 0.75rem)`,
                borderColor: `${theme.colors.primaryRed}33`,
                background: `${theme.colors.primaryRed}08`,
              }}
            >
              <div
                className="border px-4 py-2 text-center"
                style={{
                  borderColor: `${theme.colors.primaryRed}66`,
                  background: "rgba(2,6,23,0.9)",
                  boxShadow: theme.shadows.redGlow,
                }}
              >
                <div
                  className="font-display text-[9px] uppercase tracking-[0.3em] animate-pulse"
                  style={{ color: theme.colors.primaryRed }}
                >
                  ⚠️ SETOR INIMIGO ⚠️
                </div>
                <div className="mt-1 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/80">
                  ÁREA RESTRITA
                </div>
              </div>
            </div>

            {/* Neutral zone buffer (center) — colunas fixas do mapa, independentes de quem é o jogador local */}
            <div
              className="pointer-events-none absolute inset-y-3 border-x border-dashed border-primary/20 bg-primary/5 flex items-center justify-center"
              style={{
                left: `${(DEPLOYMENT_DEPTH / cols) * 100}%`,
                width: `${((cols - 2 * DEPLOYMENT_DEPTH) / cols) * 100}%`,
              }}
            >
              <div className="font-display text-[8px] uppercase tracking-[0.4em] text-muted-foreground/40">
                // ZONA NEUTRA //
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
