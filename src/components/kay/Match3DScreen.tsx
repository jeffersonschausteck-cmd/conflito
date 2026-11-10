import { Suspense, useEffect, useRef, useState } from "react";
import { ContactShadows, useContextBridge } from "@react-three/drei";
import { GameStateContext, useGameState } from "@/hooks/useGameState";
import { TopBar } from "@/components/game/TopBar";
import { PIECES } from "@/config/pieces";
import { useAITurn } from "@/hooks/useAITurn";
import { mapForPace } from "@/maps";
import { hexToPixel } from "@/services/hexGeometry";
import { FogOfWarEngine } from "@/services/fogOfWarEngine";
import type { Piece, PlayerOwner } from "@/types/piece";
import { KayPiece } from "@/components/kay/KayCharacters";
import { STOP_GAP, isFlagCapture, stepInMs, victoryDelayMs, walkMsFor } from "@/components/kay/fightTiming";
import { BoardWorld, Board3DCanvas, CombatBurst, HEX_SIZE, LegalMarker, useBoardMap, useDeviceMode } from "@/components/kay/BoardWorld";

/**
 * Tela da partida em 3D (cenário KayKit, peças animadas, HUD de comando). Usada pela rota `/game`
 * (partida de verdade) e por `/lab3d` (laboratório). Precisa estar dentro de um provedor de estado do jogo.
 */

function BoardScene({ onSelectCell, far = false }: { onSelectCell: (row: number, col: number) => void; far?: boolean }) {
  // Estado real do jogo (o mesmo que alimenta o HUD). Chega aqui pela ponte de
  // contexto montada em Match3DScreen, porque o Canvas é uma árvore React separada.
  const { state, selectedPiece, legalMoves, selectPiece, moveSelectedTo, localOwner, lastCombat } = useGameState();
  const map = useBoardMap();
  const boardW = map.cols * (Math.sqrt(3) * HEX_SIZE) + (Math.sqrt(3) * HEX_SIZE) / 2;
  const boardH = (map.rows - 1) * (HEX_SIZE * 2 * 0.75) + HEX_SIZE * 2;


  const pieces = state.pieces.filter((p) => p.isAlive);
  const selectedId = selectedPiece?.id ?? null;
  // Combate na casa do alvo: o atacante caminha até lá, os dois lutam e quem perdeu cai ali mesmo.
  // Enquanto dura, as peças de verdade envolvidas ficam escondidas e a cena usa "figurantes" delas.
  const [burst, setBurst] = useState<{ id: number; row: number; col: number } | null>(null);
  const [fight, setFight] = useState<{ combat: NonNullable<typeof lastCombat>; phase: "walk" | "hit" | "die"; wasRevealed: Record<string, boolean> } | null>(null);
  // Depois da luta, o vencedor que atacou dá o último passo (caminhando) do ponto onde parou até a casa do alvo.
  const [stepIn, setStepIn] = useState<{ id: string; from: { x: number; z: number }; go: boolean } | null>(null);
  const seenCombat = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const prevRevealed = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    if (!lastCombat || lastCombat.id === seenCombat.current) return;
    seenCombat.current = lastCombat.id;
    timers.current.forEach((t) => window.clearTimeout(t));
    setStepIn(null);
    const walkMs = walkMsFor(lastCombat);
    const c = lastCombat;
    const was = (id: string) => prevRevealed.current.get(id) === true;
    setFight({ combat: c, phase: "walk", wasRevealed: { [c.attackerId]: was(c.attackerId), [c.defenderId]: was(c.defenderId) } });
    const flagCapture = isFlagCapture(c);
    timers.current = [
      window.setTimeout(() => {
        setFight((f) => (f && f.combat.id === c.id ? { ...f, phase: "hit" } : f));
        if (!flagCapture) setBurst({ id: c.id, row: c.tile.row, col: c.tile.column });
      }, walkMs + 60),
      window.setTimeout(() => setFight((f) => (f && f.combat.id === c.id ? { ...f, phase: "die" } : f)), walkMs + 800),
      window.setTimeout(() => setBurst(null), walkMs + 1300),
      // Captura da Bandeira: a cena dura até a tela de vitória aparecer (a Bandeira desce pela haste antes).
      window.setTimeout(() => {
        setFight((f) => (f && f.combat.id === c.id ? null : f));
        // O atacante venceu: ele reaparece onde parou e caminha até a casa do alvo.
        if (!flagCapture && c.survivorId === c.attackerId) {
          const o = hexToPixel(c.attackerSnapshot.currentRow, c.attackerSnapshot.currentColumn, HEX_SIZE);
          const t = hexToPixel(c.tile.row, c.tile.column, HEX_SIZE);
          const len = Math.hypot(t.x - o.x, t.y - o.y) || 1;
          const from = { x: t.x - boardW / 2 - ((t.x - o.x) / len) * STOP_GAP, z: t.y - boardH / 2 - ((t.y - o.y) / len) * STOP_GAP };
          setStepIn({ id: c.attackerId, from, go: false });
          timers.current.push(window.setTimeout(() => setStepIn((s) => (s && s.id === c.attackerId ? { ...s, go: true } : s)), 40));
          timers.current.push(window.setTimeout(() => setStepIn(null), 40 + stepInMs()));
        }
      }, flagCapture ? victoryDelayMs(c) : walkMs + 1900),
    ];
  }, [lastCombat]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  // Guarda quem já estava revelado antes do combate (a identidade só aparece no encontro das peças).
  useEffect(() => {
    pieces.forEach((p) => prevRevealed.current.set(p.id, p.isRevealed));
  });
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

      {fight && (() => {
        const c = fight.combat;
        const att = c.attackerSnapshot;
        const def = c.defenderSnapshot;
        const from = cellPos(att.currentRow, att.currentColumn);
        const tile = cellPos(c.tile.row, c.tile.column);
        const len = Math.hypot(tile.x - from.x, tile.z - from.z) || 1;
        const ux = (tile.x - from.x) / len;
        const uz = (tile.z - from.z) / len;
        // O atacante para colado no alvo, de frente para ele.
        const stop = { x: tile.x - ux * STOP_GAP, z: tile.z - uz * STOP_GAP };
        const hitting = fight.phase !== "walk";
        const flagCapture = isFlagCapture(c);
        const dying = fight.phase === "die" && !flagCapture;
        return (
          <>
            <FightGhost key={`g-att-${c.id}`} snap={att} from={from} to={stop} localOwner={localOwner} hidden={!hitting && att.owner !== localOwner && !fight.wasRevealed[att.id] && att.pieceType !== "flag"} attacking={hitting && !flagCapture} capturing={hitting && flagCapture} dying={dying && c.removedIds.includes(att.id)} />
            <FightGhost key={`g-def-${c.id}`} snap={def} from={tile} to={tile} localOwner={localOwner} hidden={!hitting && def.owner !== localOwner && !fight.wasRevealed[def.id] && def.pieceType !== "flag"} attacking={hitting && !flagCapture} lowering={hitting && flagCapture} dying={dying && c.removedIds.includes(def.id)} />
          </>
        );
      })()}

      {pieces.filter((p) => !fight || (p.id !== fight.combat.attackerId && p.id !== fight.combat.defenderId)).map((p) => {
        const cell = cellPos(p.currentRow, p.currentColumn);
        // O vencedor que acabou de lutar começa onde parou e só então caminha até a casa.
        const pos = stepIn && stepIn.id === p.id && !stepIn.go ? stepIn.from : cell;
        const x = pos.x;
        const z = pos.z;
        return (
          <KayPiece
            key={p.id}
            x={x}
            z={z}
            owner={p.owner}
            pieceType={p.pieceType}
            color={p.owner === "blue" ? "#22d3ee" : "#fb7185"}
            hidden={FogOfWarEngine.isHiddenFrom(p, localOwner)}
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


/** Figurante de uma peça numa luta: nasce em `from`, caminha até `to` e depois ataca ou cai. */
function FightGhost({ snap, from, to, localOwner, hidden, attacking, capturing = false, lowering = false, dying }: { snap: Piece; from: { x: number; z: number }; to: { x: number; z: number }; localOwner: PlayerOwner; hidden: boolean; attacking: boolean; capturing?: boolean; lowering?: boolean; dying: boolean }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGo(true), 30); // um instante parada na casa de origem, depois caminha
    return () => window.clearTimeout(t);
  }, []);
  const pos = go ? to : from;
  return <KayPiece x={pos.x} z={pos.z} owner={snap.owner} pieceType={snap.pieceType} color={snap.owner === "blue" ? "#22d3ee" : "#fb7185"} mine={snap.owner === localOwner} hidden={hidden} attacking={attacking} capturing={capturing} lowering={lowering} dying={dying} />;
}

/** Peça selecionada em uma linha só: nome, força e patente. Respeita o Fog of War. */
function SelectedPieceChip() {
  const { selectedPiece, localOwner } = useGameState();
  if (!selectedPiece) return null;
  const hidden = FogOfWarEngine.isHiddenFrom(selectedPiece, localOwner);
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
  // A IA joga só offline, com o lado oposto ao do jogador (que é sorteado; docs/04-Regras.md, seção 18).
  const { localOwner, state: matchState } = useGameState();
  const map = mapForPace(matchState.config.pace);
  useAITurn({ enabled: !isOnline, aiPlayer: localOwner === "blue" ? "RED" : "BLUE" });
  // O Canvas é outra árvore React: a ponte leva o estado do jogo pra dentro dele.
  const Bridge = useContextBridge(GameStateContext);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-foreground">
      {/* 3D em tela cheia, atrás do HUD */}
      {mounted && (
        <div className="absolute inset-0 z-0 touch-none">
          <Board3DCanvas flip={localOwner === "red"} map={map}>
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
      <div className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-900/60">
        arraste: mover a câmera · scroll: zoom
      </div>
    </div>
  );
}
