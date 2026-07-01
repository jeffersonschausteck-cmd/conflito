import type { Piece, PieceId, PlayerOwner } from "@/types/piece";
import type { CombatResult } from "@/types/combat";

/**
 * FogOfWarEngine — pure, additive visibility layer.
 *
 * The engine owns NO state. It never mutates GameState, never touches
 * MovementEngine or CombatEngine, and never dispatches actions. It only
 * *derives* what a given viewer is allowed to know about each piece.
 *
 * Rules (v0.1):
 *   - A piece's true identity (type + rank) is visible to its owner.
 *   - Enemy pieces are visible only after `isRevealed` is set true.
 *   - Reveals are permanent — combat is currently the only trigger, and
 *     CombatEngine already flips the flag; this engine merely reads it.
 *   - Color + position are always public information.
 */

/** Local player perspective. Multiplayer will inject this per-viewer. */
export const LOCAL_VIEWER: PlayerOwner = "blue";

export interface RevealEntry {
  /** Stable id: `${combatId}:${pieceId}` — safe as React key. */
  id: string;
  pieceId: PieceId;
  owner: PlayerOwner;
  pieceType: Piece["pieceType"];
  rank: number;
  /** Wall-clock timestamp for ordering in the UI log. */
  at: number;
}

export const FogOfWarEngine = {
  /**
   * True when `viewer` is not allowed to see this piece's true identity.
   * Owner always sees own units; enemies only after reveal.
   */
  isHiddenFrom(piece: Piece, viewer: PlayerOwner): boolean {
    if (piece.owner === viewer) return false;
    return !piece.isRevealed;
  },

  /**
   * Returns the reveal events introduced by a CombatResult. Pieces
   * that were already revealed before combat are omitted so the log
   * only records genuine discoveries.
   *
   * `piecesBefore` is the pieces array as it was BEFORE combat resolved.
   */
  reveals(result: CombatResult, piecesBefore: Piece[], at: number = Date.now()): RevealEntry[] {
    const wasRevealed = new Map<PieceId, boolean>();
    for (const p of piecesBefore) wasRevealed.set(p.id, p.isRevealed);

    const entries: RevealEntry[] = [];
    for (const snap of [result.attackerSnapshot, result.defenderSnapshot]) {
      if (wasRevealed.get(snap.id) === true) continue;
      entries.push({
        id: `${result.id}:${snap.id}`,
        pieceId: snap.id,
        owner: snap.owner,
        pieceType: snap.pieceType,
        rank: snap.rank,
        at,
      });
    }
    return entries;
  },
};

export type FogOfWarEngineType = typeof FogOfWarEngine;
