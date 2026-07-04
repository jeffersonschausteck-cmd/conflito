import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { FactionIcon } from "@/components/FactionIcon";
import { Piece } from "@/components/Piece";
import { FACTIONS, flowState } from "@/services/flowState";
import { DeploymentManager } from "@/services/deploymentManager";
import { GameButton } from "@/components/ui/GameButton";
import { GamePanel } from "@/components/ui/GamePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GameTooltip } from "@/components/ui/GameTooltip";
import { theme } from "@/design/theme";
import type { Piece as PieceModel, PieceType } from "@/types/piece";

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

const PIECE_NAMES: Record<PieceType, string> = {
  commander: "Comandante",
  officer: "Oficial",
  sniper: "Atirador",
  engineer: "Engenheiro",
  infantry: "Infantaria",
  scout: "Batedor",
  spy: "Espião",
  bomb: "Bomba",
  flag: "Bandeira",
};

const PIECE_LIMITS: Record<PieceType, number> = {
  flag: 2,
  bomb: 2,
  commander: 1,
  officer: 5,
  spy: 2,
  sniper: 4,
  engineer: 4,
  infantry: 10,
  scout: 10,
};

function getRankForType(type: PieceType): number {
  switch (type) {
    case "commander": return 10;
    case "officer": return 8;
    case "sniper": return 7;
    case "engineer": return 5;
    case "infantry": return 4;
    case "scout": return 2;
    case "spy": return 1;
    default: return 0;
  }
}

// ─── DeploymentPage ──────────────────────────────────────────────────────────

function DeploymentPage() {
  const navigate = useNavigate();
  const flow = flowState.read();
  const faction = FACTIONS.find((f) => f.id === flow.faction) ?? FACTIONS[1];

  const [pieces, setPieces] = useState<PieceModel[]>(() =>
    DeploymentManager.createDefaultPlayerDeployment()
  );
  const [selectedBoardPieceId, setSelectedBoardPieceId] = useState<string | null>(null);
  const [selectedTrayPieceType, setSelectedTrayPieceType] = useState<PieceType | null>(null);

  const rows = 10;
  const cols = 10;

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
    () => DeploymentManager.validateDeployment(pieces, rows, cols),
    [pieces]
  );

  const selectedBoardPiece = useMemo(
    () => pieces.find((p) => p.id === selectedBoardPieceId) || null,
    [pieces, selectedBoardPieceId]
  );

  // ── Handlers (game logic unchanged) ────────────────────────────────────────

  const handleCellClick = (r: number, c: number) => {
    if (r < 6 || r > 9) return;

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
    setPieces(DeploymentManager.createDefaultPlayerDeployment());
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
    const aiPieces = DeploymentManager.generateAIDeployment(rows, cols);
    const finalPieces = [...pieces, ...aiPieces];
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("psc:initial-pieces", JSON.stringify(finalPieces));
    }
    navigate({ to: "/game" });
  };

  const cellH = 10;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <CyberBackground />

      {/* ── Header HUD ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between border-b border-primary/20 bg-background/40 px-6 py-3 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-3" style={{ color: faction.color }}>
          <FactionIcon faction={faction.id} color={faction.color} size={28} />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Comandante
            </div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
              {faction.name}
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

      {/* ── Grid + Sidebar ───────────────────────────────────────────────── */}
      <section className="relative z-10 grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_360px] lg:px-8">

        {/* ── Tactical Map ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative w-full max-w-[min(80vh,80vw)] mx-auto p-3 rounded-lg border backdrop-blur-sm"
            style={{
              borderColor: `${theme.colors.primaryBlue}4D`, // 30% opacity
              background: "rgba(2,6,23,0.7)",
              boxShadow: theme.shadows.blueGlow,
            }}
          >
            <div className="grid gap-[2px] grid-cols-10 grid-rows-10 aspect-square w-full relative">
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const piece = pieces.find((p) => p.currentRow === r && p.currentColumn === c);
                  const isPlayerZone = r >= 6;
                  const isMidfield = r === 4 || r === 5;

                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`relative aspect-square w-full select-none outline-none border transition-all duration-150 ease-out flex items-center justify-center ${isPlayerZone
                        ? isDark
                          ? "bg-slate-900/60 border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 cursor-pointer"
                          : "bg-slate-900/30 border-cyan-500/15 hover:bg-cyan-500/10 hover:border-cyan-400/30 cursor-pointer"
                        : isMidfield
                          ? "bg-slate-950/40 border-slate-900/30 cursor-not-allowed"
                          : "bg-red-950/10 border-red-950/20 cursor-not-allowed"
                        }`}
                    >
                      {piece && piece.id === selectedBoardPieceId && (
                        <div
                          className="absolute inset-0 border-2 animate-pulse"
                          style={{
                            borderColor: theme.colors.primaryBlue,
                            background: `${theme.colors.primaryBlue}1A`,
                            boxShadow: theme.shadows.blueGlow,
                          }}
                        />
                      )}
                      {piece && (
                        <Piece
                          piece={piece}
                          selected={piece.id === selectedBoardPieceId}
                          hidden={false}
                          onClick={handlePieceClick}
                        />
                      )}
                    </div>
                  );
                })
              )}

              {/* Enemy Zone overlay */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center border backdrop-blur-[2px]"
                style={{
                  height: `${4 * cellH}%`,
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

              {/* Midfield buffer */}
              <div
                className="pointer-events-none absolute inset-x-0 border-y border-dashed border-primary/20 bg-primary/5 flex items-center justify-center"
                style={{ top: `${4 * cellH}%`, height: `${2 * cellH}%` }}
              >
                <div className="font-display text-[8px] uppercase tracking-[0.4em] text-muted-foreground/40">
                  // ZONA NEUTRA //
                </div>
              </div>
            </div>
          </div>
        </div>

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
              variant={isReady ? "primary" : "disabled"}
              size="lg"
              disabled={!isReady}
              onClick={handleConfirm}
              className="w-full"
            >
              Iniciar Batalha ▶
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
                    owner: "blue",
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
      </section>
    </main>
  );
}
