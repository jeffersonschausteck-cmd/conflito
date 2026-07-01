import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { FogOfWarEngine, type RevealEntry } from "@/services/fogOfWarEngine";
import { SoundHooks } from "@/services/soundHooks";
import type { PieceId } from "@/types/piece";

/**
 * Derives a rolling reveal log from GameState.lastCombat without
 * touching the state structure itself. Also exposes the set of piece
 * ids revealed by the most recent combat so the board can flash a
 * 500ms discovery pulse.
 */
export function useRevealLog(max: number = 24) {
  const { state, lastCombat } = useGameState();
  const [log, setLog] = useState<RevealEntry[]>([]);
  const [justRevealed, setJustRevealed] = useState<Set<PieceId>>(new Set());

  // Snapshot pieces BEFORE combat resolves so we can detect genuine
  // reveals (pieces whose isRevealed flipped from false -> true).
  const prevPiecesRef = useRef(state.pieces);
  const lastHandledRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastCombat) {
      prevPiecesRef.current = state.pieces;
      return;
    }
    if (lastHandledRef.current === lastCombat.id) return;
    lastHandledRef.current = lastCombat.id;

    const entries = FogOfWarEngine.reveals(lastCombat, prevPiecesRef.current);
    prevPiecesRef.current = state.pieces;

    if (entries.length === 0) return;

    setLog((prev) => [...entries, ...prev].slice(0, max));
    setJustRevealed(new Set(entries.map((e) => e.pieceId)));
    SoundHooks.playReveal();

    const t = window.setTimeout(() => setJustRevealed(new Set()), 500);
    return () => window.clearTimeout(t);
  }, [lastCombat, state.pieces, max]);

  return { log, justRevealed };
}
