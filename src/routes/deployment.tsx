import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CyberBackground } from "@/components/CyberBackground";
import { CyberButton } from "@/components/CyberButton";
import { FactionIcon } from "@/components/FactionIcon";
import { Piece } from "@/components/Piece";
import { FACTIONS, flowState } from "@/services/flowState";
import { DeploymentManager } from "@/services/deploymentManager";
import type { Piece as PieceModel, PieceType } from "@/types/piece";

export const Route = createFileRoute("/deployment")({
  head: () => ({
    meta: [{ title: "Deployment Phase — Shadow Command" }],
  }),
  component: DeploymentPage,
});

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
  commander: "Commander",
  officer: "Officer",
  sniper: "Sniper",
  engineer: "Engineer",
  infantry: "Infantry",
  scout: "Scout",
  spy: "Spy",
  bomb: "Bomb",
  flag: "Flag",
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

function DeploymentPage() {
  const navigate = useNavigate();
  const flow = flowState.read();
  const faction = FACTIONS.find((f) => f.id === flow.faction) ?? FACTIONS[1];

  // Initialize with default configuration pre-placed
  const [pieces, setPieces] = useState<PieceModel[]>(() =>
    DeploymentManager.createDefaultPlayerDeployment()
  );

  const [selectedBoardPieceId, setSelectedBoardPieceId] = useState<string | null>(null);
  const [selectedTrayPieceType, setSelectedTrayPieceType] = useState<PieceType | null>(null);

  const rows = 10;
  const cols = 10;

  // Reactively calculate tray counts
  const trayCounts = useMemo(() => {
    const counts = { ...PIECE_LIMITS };
    pieces.forEach((p) => {
      if (p.currentRow !== -1) {
        counts[p.pieceType] = Math.max(0, counts[p.pieceType] - 1);
      }
    });
    return counts;
  }, [pieces]);

  const piecesRemaining = useMemo(() => {
    return pieces.filter((p) => p.currentRow === -1).length;
  }, [pieces]);

  const isReady = useMemo(() => {
    return DeploymentManager.validateDeployment(pieces, rows, cols);
  }, [pieces]);

  const selectedBoardPiece = useMemo(() => {
    return pieces.find((p) => p.id === selectedBoardPieceId) || null;
  }, [pieces, selectedBoardPieceId]);

  // Click handler for board cells
  const handleCellClick = (r: number, c: number) => {
    // Only allow interactions in the deployment zone (rows 6-9)
    if (r < 6 || r > 9) return;

    const existingPiece = pieces.find(
      (p) => p.currentRow === r && p.currentColumn === c
    );

    // Case 1: Placing a piece selected from the tray
    if (selectedTrayPieceType) {
      const remaining = trayCounts[selectedTrayPieceType];
      if (remaining <= 0 && (!existingPiece || existingPiece.pieceType !== selectedTrayPieceType)) {
        // No remaining pieces of this type in tray
        setSelectedTrayPieceType(null);
        return;
      }

      // If occupied by another piece, return it to the tray
      let updatedPieces = [...pieces];
      if (existingPiece) {
        updatedPieces = updatedPieces.map((p) =>
          p.id === existingPiece.id
            ? { ...p, currentRow: -1, currentColumn: -1 }
            : p
        );
      }

      // Find first unplaced piece of the selected type
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

      // Keep it selected to allow placing multiples, unless out
      if (trayCounts[selectedTrayPieceType] <= 1 && (!existingPiece || existingPiece.pieceType !== selectedTrayPieceType)) {
        setSelectedTrayPieceType(null);
      }
      return;
    }

    // Case 2: Moving/swapping an already selected piece on the board
    if (selectedBoardPieceId) {
      if (existingPiece && existingPiece.id === selectedBoardPieceId) {
        // Clicking same piece deselects it
        setSelectedBoardPieceId(null);
        return;
      }

      const updatedPieces = pieces.map((p) => {
        if (p.id === selectedBoardPieceId) {
          // Move selected to target cell
          return {
            ...p,
            currentRow: r,
            currentColumn: c,
          };
        }
        if (existingPiece && p.id === existingPiece.id) {
          // Swap occupied piece to selected piece's original cell
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

    // Case 3: Selecting a piece on the board
    if (existingPiece) {
      setSelectedBoardPieceId(existingPiece.id);
      setSelectedTrayPieceType(null);
    }
  };

  // Click handler for pieces (delegates to cell clicks)
  const handlePieceClick = (piece: PieceModel) => {
    handleCellClick(piece.currentRow, piece.currentColumn);
  };

  // Tray piece select handler
  const handleTrayPieceSelect = (type: PieceType) => {
    if (trayCounts[type] <= 0) return;
    setSelectedTrayPieceType(type === selectedTrayPieceType ? null : type);
    setSelectedBoardPieceId(null);
  };

  // Reset all pieces to the tray
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

  // Auto-fill with default configuration
  const handleAutoFill = () => {
    setPieces(DeploymentManager.createDefaultPlayerDeployment());
    setSelectedBoardPieceId(null);
    setSelectedTrayPieceType(null);
  };

  // Recall selected board piece to tray
  const handleRecallSelected = () => {
    if (!selectedBoardPieceId) return;
    const updated = pieces.map((p) =>
      p.id === selectedBoardPieceId ? { ...p, currentRow: -1, currentColumn: -1 } : p
    );
    setPieces(updated);
    setSelectedBoardPieceId(null);
  };

  // Confirm formation and start battle
  const handleConfirm = () => {
    if (!isReady) return;

    // 1. Generate AI deployment
    const aiPieces = DeploymentManager.generateAIDeployment(rows, cols);

    // 2. Combine formations
    const finalPieces = [...pieces, ...aiPieces];

    // 3. Save to sessionStorage
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("psc:initial-pieces", JSON.stringify(finalPieces));
    }

    // 4. Open Battle screen
    navigate({ to: "/game" });
  };

  const cellW = 10;
  const cellH = 10;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <CyberBackground />

      {/* Cyber Header HUD */}
      <header className="relative z-10 flex items-center justify-between border-b border-primary/20 bg-background/40 px-6 py-3 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-3" style={{ color: faction.color }}>
          <FactionIcon faction={faction.id} color={faction.color} size={28} />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Operator
            </div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
              {faction.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Phase
            </div>
            <div className="font-display text-lg font-bold text-primary animate-pulse">
              DEPLOYMENT
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-destructive"
          >
            ⛔ Cancel Mission
          </button>
        </div>
      </header>

      {/* Deployment Grid + Controls */}
      <section className="relative z-10 grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="flex flex-col items-center justify-center">
          {/* Tactical Map Container */}
          <div className="relative w-full max-w-[min(80vh,80vw)] mx-auto p-3 rounded-lg border border-cyan-500/30 bg-slate-950/70 backdrop-blur-sm shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)]">
            
            {/* The 10x10 Grid representation */}
            <div className="grid gap-[2px] grid-cols-10 grid-rows-10 aspect-square w-full relative">
              
              {/* Build empty grid tiles */}
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const piece = pieces.find(
                    (p) => p.currentRow === r && p.currentColumn === c
                  );
                  const isPlayerZone = r >= 6;
                  const isMidfield = r === 4 || r === 5;
                  const isEnemyZone = r < 4;

                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`relative aspect-square w-full select-none outline-none border transition-all duration-150 ease-out flex items-center justify-center ${
                        isPlayerZone
                          ? isDark
                            ? "bg-slate-900/60 border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 cursor-pointer"
                            : "bg-slate-900/30 border-cyan-500/15 hover:bg-cyan-500/10 hover:border-cyan-400/30 cursor-pointer"
                          : isMidfield
                          ? "bg-slate-950/40 border-slate-900/30 cursor-not-allowed"
                          : "bg-red-950/10 border-red-950/20 cursor-not-allowed"
                      }`}
                    >
                      {/* Highlight if selected */}
                      {piece && piece.id === selectedBoardPieceId && (
                        <div className="absolute inset-0 border-2 border-cyan-400 bg-cyan-400/10 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.4)]" />
                      )}

                      {/* Render Piece if present */}
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

              {/* Holographic Overlay for Enemy Zone (Rows 0-3) */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center border border-red-500/20 bg-red-950/30 backdrop-blur-[2px]"
                style={{ height: `${4 * cellH}%` }}
              >
                <div className="border border-red-500/40 bg-slate-950/90 px-4 py-2 text-center shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                  <div className="font-display text-[9px] uppercase tracking-[0.3em] text-red-500 animate-pulse">
                    ⚠️ ENEMY SECTOR ENCRYPTED ⚠️
                  </div>
                  <div className="mt-1 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/80">
                    CLASSIFIED ZONE
                  </div>
                </div>
              </div>

              {/* Holographic Border for Midfield Boundary */}
              <div
                className="pointer-events-none absolute inset-x-0 border-y border-dashed border-primary/20 bg-primary/5 flex items-center justify-center"
                style={{ top: `${4 * cellH}%`, height: `${2 * cellH}%` }}
              >
                <div className="font-display text-[8px] uppercase tracking-[0.4em] text-muted-foreground/40">
                  // NEUTRAL BUFFER ZONE //
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <aside className="flex flex-col gap-6">
          
          {/* Tactical Status */}
          <div
            className="border border-primary/30 bg-card/40 p-5 text-left backdrop-blur-md"
            style={{
              clipPath:
                "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
            }}
          >
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
              // OPERATIONS PANEL
            </h3>
            
            <div className="mt-4 space-y-3 font-display text-[10px] uppercase tracking-[0.25em]">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Formation Status:</span>
                <span
                  className={
                    isReady
                      ? "text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-pulse"
                      : "text-rose-400 font-bold"
                  }
                >
                  {isReady ? "FORMATION READY" : "INCOMPLETE"}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Unplaced Assets:</span>
                <span className={piecesRemaining > 0 ? "text-primary font-bold" : "text-emerald-400 font-bold"}>
                  {piecesRemaining} / 40
                </span>
              </div>
            </div>

            {selectedBoardPiece && (
              <div className="mt-4 border border-cyan-500/20 bg-cyan-950/20 p-3">
                <div className="font-display text-[9px] uppercase tracking-[0.2em] text-cyan-400">
                  Selected Unit:
                </div>
                <div className="mt-1 font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground">
                  {PIECE_NAMES[selectedBoardPiece.pieceType]} (Rank {selectedBoardPiece.rank})
                </div>
                <button
                  onClick={handleRecallSelected}
                  className="mt-3 w-full border border-destructive/50 bg-destructive/10 py-1.5 font-display text-[9px] uppercase tracking-[0.2em] text-destructive hover:bg-destructive hover:text-white transition-colors"
                >
                  Recall to Tray
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid gap-2">
            <CyberButton
              variant="primary"
              disabled={!isReady}
              onClick={handleConfirm}
              className="w-full text-center"
            >
              Start Battle ▶
            </CyberButton>

            <div className="grid grid-cols-2 gap-2">
              <CyberButton
                variant="secondary"
                onClick={handleAutoFill}
                className="w-full text-[10px] tracking-[0.15em] py-2"
              >
                Auto-Fill
              </CyberButton>
              <CyberButton
                variant="ghost"
                onClick={handleReset}
                className="w-full border border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive/80 text-[10px] tracking-[0.15em] py-2"
              >
                Reset Layout
              </CyberButton>
            </div>
          </div>

          {/* Piece Tray (Scrollable sidebar box) */}
          <div
            className="flex-1 border border-border/60 bg-slate-950/60 p-4 min-h-[300px] overflow-y-auto"
            style={{
              clipPath:
                "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
            }}
          >
            <h4 className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
              // UNIT TRAY
            </h4>

            {piecesRemaining === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center text-center p-4">
                <div className="text-emerald-400 text-2xl mb-2">✓</div>
                <div className="font-display text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  All forces deployed. Customize layout by selecting and swapping assets directly on the map.
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
                      className={`flex items-center gap-4 border p-2 text-left transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_-3px_rgba(34,211,238,0.4)]"
                          : "border-border/40 bg-card/20 hover:border-cyan-500/30 hover:bg-cyan-500/5"
                      }`}
                    >
                      <div className="h-10 w-10 flex items-center justify-center bg-slate-900 border border-border/50">
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
                      <div className="font-display text-xs font-bold text-primary text-glow pr-2">
                        x{remaining}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
