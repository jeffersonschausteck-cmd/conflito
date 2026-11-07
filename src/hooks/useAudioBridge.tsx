import { useEffect, useRef } from "react";
import { useGameState } from "@/hooks/useGameState";
import { SoundHooks } from "@/services/soundHooks";
import { AudioManager } from "@/services/audioManager";
import { ownerToPlayer } from "@/types/gameState";
import type { Piece, PieceId } from "@/types/piece";
import type { Player } from "@/types/gameState";

interface StateSnapshot {
  turnNumber: number;
  currentPlayer: Player;
  gameOver: boolean;
  lastCombatId: number | null;
  selectedPieceId: PieceId | null;
  piecePositions: Map<PieceId, string>;
}

function snapshot(pieces: Piece[], rest: Omit<StateSnapshot, "piecePositions">): StateSnapshot {
  const piecePositions = new Map<PieceId, string>();
  for (const p of pieces) piecePositions.set(p.id, `${p.currentRow}-${p.currentColumn}`);
  return { ...rest, piecePositions };
}

/**
 * Sprint AUDIO-01 — ponte única entre `GameState` e os efeitos sonoros
 * que dependem de uma TRANSIÇÃO de estado (não de um clique isolado):
 * início de partida, fim de turno, movimento, vitória/derrota. Combate
 * e Revelação já têm seu próprio ponto de detecção em
 * `useRevealLog.tsx` (mesma ideia, escopo mais restrito) — não
 * duplicado aqui.
 *
 * Funciona igual online e offline: os dois alimentam o mesmo
 * `GameStateContext`, então esta ponte nunca precisa saber a origem
 * do estado, só compará-lo com o anterior.
 */
export function useAudioBridge(): void {
  const { state, localOwner } = useGameState();
  const prevRef = useRef<StateSnapshot | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    const next = snapshot(state.pieces, {
      turnNumber: state.turnNumber,
      currentPlayer: state.currentPlayer,
      gameOver: state.gameOver,
      lastCombatId: state.lastCombat?.id ?? null,
      selectedPieceId: state.selectedPieceId,
    });

    if (!prev) {
      SoundHooks.playMatchStart();
      AudioManager.playBattleMusic();
      prevRef.current = next;
      return;
    }

    // Vitória/derrota tem prioridade sobre qualquer outro som da mesma transição.
    if (next.gameOver && !prev.gameOver) {
      const isVictory = state.winner === ownerToPlayer(localOwner);
      if (isVictory) SoundHooks.playVictory();
      else SoundHooks.playDefeat();
      AudioManager.stopBattleMusic();
      prevRef.current = next;
      return;
    }

    // Sprint AUDIO-01 — `GameEngine.moveSelectedTo` chama `finalizeTurn`
    // ao final de TODO movimento válido (uma ação = o turno acaba); ou
    // seja, Movimento e Fim de Turno quase sempre acontecem na MESMA
    // transição de estado. Os dois tocam juntos aqui — não são
    // mutuamente exclusivos como Vitória/Derrota.
    const turnChanged = next.turnNumber !== prev.turnNumber || next.currentPlayer !== prev.currentPlayer;

    // Combate já tocou seu próprio som em `useRevealLog` — aqui só evita
    // duplicar o som de Movimento quando este mesmo ciclo já foi um
    // combate novo (o deslocamento que resultou nele já está coberto
    // pelo som de Combate).
    const combatHappenedThisTick = next.lastCombatId !== null && next.lastCombatId !== prev.lastCombatId;

    let moved = false;
    if (!combatHappenedThisTick) {
      for (const [id, pos] of next.piecePositions) {
        if (prev.piecePositions.get(id) !== pos) {
          moved = true;
          break;
        }
      }
      if (moved) SoundHooks.playUnitMovement();
    }

    if (turnChanged) {
      SoundHooks.playEndTurn();
    } else if (!moved && next.selectedPieceId && next.selectedPieceId !== prev.selectedPieceId) {
      // Seleção só toca quando NADA mais mudou nesta transição — clicar
      // pra mover/atacar também altera `selectedPieceId` (volta a
      // `null`), e isso não deve soar como uma nova seleção.
      SoundHooks.playUnitSelection();
    }

    prevRef.current = next;
  }, [state, localOwner]);
}
