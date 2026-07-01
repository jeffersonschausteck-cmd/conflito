import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useGameState } from "@/hooks/useGameState";
import { FogOfWarEngine, type RevealEntry } from "@/services/fogOfWarEngine";
import { SoundHooks } from "@/services/soundHooks";
import type { PieceId } from "@/types/piece";

/**
 * Rolling reveal log derived from GameState.lastCombat. Kept as a
 * provider so the board (which needs the "just revealed" pulse set)
 * and the HUD panel (which needs the log entries) share a single
 * subscription — otherwise both would double-fire the sound hook and
 * race against BoardWithPieces' 900ms clearLastCombat timer.
 *
 * Purely additive: it never touches GameState and never mutates any
 * piece — it only reads snapshots via FogOfWarEngine.reveals().
 */
export interface RevealLogApi {
  log: RevealEntry[];
  /** Piece ids whose reveal happened within the last 500ms. */
  justRevealed: Set<PieceId>;
}

const RevealLogContext = createContext<RevealLogApi | null>(null);

export interface RevealLogProviderProps {
  max?: number;
  children: ReactNode;
}

export function RevealLogProvider({ max = 24, children }: RevealLogProviderProps) {
  const { state, lastCombat } = useGameState();
  const [log, setLog] = useState<RevealEntry[]>([]);
  const [justRevealed, setJustRevealed] = useState<Set<PieceId>>(new Set());

  const prevPiecesRef = useRef(state.pieces);
  const lastHandledRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastCombat) {
      prevPiecesRef.current = state.pieces;
      return;
    }
    if (lastHandledRef.current === lastCombat.id) {
      prevPiecesRef.current = state.pieces;
      return;
    }
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

  const value = useMemo<RevealLogApi>(() => ({ log, justRevealed }), [log, justRevealed]);
  return <RevealLogContext.Provider value={value}>{children}</RevealLogContext.Provider>;
}

export function useRevealLog(): RevealLogApi {
  const ctx = useContext(RevealLogContext);
  if (ctx) return ctx;
  // Safe fallback: outside a provider we return empty state instead of
  // throwing so isolated component tests keep working.
  return { log: [], justRevealed: new Set() };
}
