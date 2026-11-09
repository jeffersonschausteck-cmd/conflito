import { Suspense, useEffect, useState } from "react";
import { ContactShadows, useContextBridge } from "@react-three/drei";
import { GameStateContext, useGameState } from "@/hooks/useGameState";
import { TopBar } from "@/components/game/TopBar";
import { PIECES } from "@/config/pieces";
import { useAITurn } from "@/hooks/useAITurn";
import { ACTIVE_MAP } from "@/maps";
import { hexToPixel } from "@/services/hexGeometry";
import { KayPiece } from "@/components/kay/KayCharacters";
import { BoardWorld, Board3DCanvas, CombatBurst, HEX_SIZE, LegalMarker, useDeviceMode } from "@/components/kay/BoardWorld";
import { MatchPaceHud, TideMarks } from "@/components/kay/MatchPaceHud";

/**
 * Tela da partida em 3D (cenário KayKit, peças animadas, HUD de comando). Usada pela rota `/game`
 * (partida de verdade) e por `/lab3d` (laboratório). Precisa estar dentro de um provedor de estado do jogo.
 */

function BoardScene({ onSelectCell, far = false }: { onSelectCell: (row: number, col: number) => void; far?: boolean }) {
  // Estado real do jogo (o mesmo que alimenta o HUD). Chega aqui pela ponte de
  // contexto montada em Match3DScreen, porque o Canvas é uma árvore React separada.
  const { state, selectedPiece, legalMoves, selectPiece, moveSelectedTo, localOwner, lastCombat } = useGameState();
  const map = ACTIVE_MAP;
  const boardW = map.cols * (Math.sqrt(3) * HEX_SIZE) + (Math.sqrt(3) * HEX_SIZE) / 2;
  const boardH = (map.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2;


  const pieces = state.pieces.filter((p) => p.isAlive);
  const selectedId = selectedPiece?.id ?? null;
  // Explosão no combate: nasce quando um novo combate acontece e some sozinha.
  const [burst, setBurst] = useState<{ id: number; row: number; col: number } | null>(null);
  const [dying, setDying] = useState<{ p: (typeof state.pieces)[number]; atTile: boolean }[]>([]);
  useEffect(() => {
    if (!lastCombat) return;
    setBurst({ id: lastCombat.id, row: lastCombat.tile.row, col: lastCombat.tile.column });
    // Quem perdeu sai do jogo na hora, mas fica na tela caindo (animação de morte) por um instante.
    const fallen = [lastCombat.attackerSnapshot, lastCombat.defenderSnapshot].filter((p) => lastCombat.removedIds.includes(p.id));
    setDying(fallen.map((p) => ({ p, atTile: p.id === lastCombat.defenderId })));
    const t = window.setTimeout(() => setBurst(null), 1100);
    const t2 = window.setTimeout(() => setDying([]), 1800);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [lastCombat]);
  const cellPos = (row: number, col: number) => {
    const { x, y } = hexToPixel(row, col, HEX_SIZE);
    return { x: x - boardW / 2, z: y - boardH / 2 };
  };

  // Mesma lógica de clique do tabuleiro 2D (BoardWithPieces).
  const clickTile = (row: number, col: number) => {
    if (legalMoves.has(`${row}-${col}`)) moveSelectedTo(row, col);
    onSelectCell(row, col);
  };
  const clickPiece = (p: (typeof pieces)[number]) => {
    if (selectedId && p.id !== selectedId && legalMoves.has(`${p.currentRow}-${p.currentColumn}`)) {
      moveSelectedTo(p.currentRow, p.currentColumn);
    } else if (selectedId && p.id !== selectedId && p.owner !== localOwner) {
      // alvo inimigo fora de alcance: ação inválida, não troca a seleção
    } else {
      selectPiece(p.id === selectedId ? null : p.id);
    }
    onSelectCell(p.currentRow, p.currentColumn);
  };

  return (
    <>
      <BoardWorld far={far} onSelectTile={clickTile} />
      <TideMarks />

      {/* Casas para onde a peça selecionada pode ir: verde = mover, vermelho = atacar (há inimigo) */}
      {(selectedPiece?.owner === localOwner ? [...legalMoves] : []).map((key) => {
        const [r, c] = key.split("-").map(Number);
        const { x, z } = cellPos(r, c);
        const enemy = pieces.some((p) => p.currentRow === r && p.currentColumn === c && p.owner !== localOwner);
        return <LegalMarker key={`legal-${key}`} x={x} z={z} attack={enemy} />;
      })}

      {burst && (() => {
        const { x, z } = cellPos(burst.row, burst.col);
        return <CombatBurst key={burst.id} x={x} z={z} />;
      })()}

      {dying.map(({ p, atTile }) => {
        const { x, z } = cellPos(p.currentRow, p.currentColumn);
        return <KayPiece key={`dying-${p.id}`} x={x} z={z + (atTile ? 0.5 : 0)} owner={p.owner} pieceType={p.pieceType} color={p.owner === "blue" ? "#22d3ee" : "#fb7185"} mine={p.owner === localOwner} dying />;
      })}

      {pieces.map((p) => {
        const { x, z } = cellPos(p.currentRow, p.currentColumn);
        return (
          <KayPiece
            key={p.id}
            x={x}
            z={z}
            owner={p.owner}
            pieceType={p.pieceType}
            color={p.owner === "blue" ? "#22d3ee" : "#fb7185"}
            hidden={p.owner !== localOwner && !p.isRevealed}
            selected={p.id === selectedId && selectedPiece?.owner === localOwner}
            mine={p.owner === localOwner}
            label={p.owner !== localOwner && p.isRevealed}
            pop={lastCombat?.survivorId === p.id ? lastCombat.id : null}
            onClick={() => clickPiece(p)}
          />
        );
      })}

      <ContactShadows position={[0, -0.5, 0]} opacity={0.5} scale={40} blur={2} far={4} />
    </>
  );
}


/** Peça selecionada em uma linha só: nome, força e patente. Respeita o Fog of War. */
function SelectedPieceChip() {
  const { selectedPiece, localOwner } = useGameState();
  if (!selectedPiece) return null;
  const hidden = selectedPiece.owner !== localOwner && !selectedPiece.isRevealed;
  const info = PIECES[selectedPiece.pieceType];
  const team = selectedPiece.owner === "blue" ? "bg-cyan-400" : "bg-rose-400";
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-white/15 bg-slate-950/70 px-4 py-1 font-display text-[11px] uppercase tracking-[0.18em] text-slate-100 backdrop-blur-sm">
        <span className={`h-2 w-2 rounded-full ${team}`} />
        {hidden ? (
          <span>Unidade desconhecida</span>
        ) : (
          <>
            <span className="font-bold">{info.nome}</span>
            <span className="text-slate-400">Força {info.patente ?? "—"}</span>
            <span className="text-slate-400">Patente {info.patente ?? "—"}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function Match3DScreen({ isOnline = false }: { isOnline?: boolean }) {
  // WebGL/Three.js não existe no servidor — evita montar o `Canvas`
  // durante o SSR, só depois que o componente já está rodando no cliente.
  const { mounted } = useDeviceMode();
  // A IA do Vermelho joga só offline (antes rodava dentro da barra de ações, que saiu da tela).
  useAITurn({ enabled: !isOnline });
  // O Canvas é outra árvore React: a ponte leva o estado do jogo pra dentro dele.
  const Bridge = useContextBridge(GameStateContext);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-foreground">
      {/* 3D em tela cheia, atrás do HUD */}
      {mounted && (
        <div className="absolute inset-0 z-0 touch-none">
          <Board3DCanvas>
            <Bridge>
              <Suspense fallback={null}>
                <BoardScene onSelectCell={() => {}} />
              </Suspense>
            </Bridge>
          </Board3DCanvas>
        </div>
      )}

      {/* HUD — mesmos componentes e a mesma organização da tela /game.
          O container não captura o mouse: só os painéis, pra câmera receber o arrasto no meio. */}
      <div className="pointer-events-none relative z-10 grid h-full min-h-0 grid-rows-[auto_1fr]">
        {/* Barra superior + peça selecionada, discreta, logo abaixo dela */}
        <div className="pointer-events-auto relative">
          <TopBar />
          <SelectedPieceChip />
        </div>
      </div>
      <MatchPaceHud />
      <div className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-900/60">
        arraste: mover a câmera · scroll: zoom
      </div>
    </div>
  );
}
