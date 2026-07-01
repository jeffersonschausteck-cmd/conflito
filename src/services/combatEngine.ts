import { PieceManager } from "@/services/pieceManager";
import type { Piece, PieceId } from "@/types/piece";
import type { Coord } from "@/types/movement";
import type { CombatOutcome, CombatResult } from "@/types/combat";

/**
 * CombatEngine — pure, stateless combat resolver.
 *
 * Responsibilities (SRP):
 *   - Detect collisions between attacker and defender
 *   - Decide outcome from rank comparison
 *   - Reveal both combatants
 *   - Produce a new pieces array + CombatResult record
 *
 * Version 0.1 rules:
 *   - Higher rank wins; loser removed.
 *   - Equal rank => mutual destruction (both removed).
 *   - Winner occupies the target tile.
 *   - Both pieces become isRevealed after combat.
 *
 * The engine is fully independent of React and MovementEngine. It
 * takes a pieces array in and returns a new pieces array out — no
 * hidden state, no UI concerns.
 */

let _combatSeq = 0;
const nextCombatId = (): number => ++_combatSeq;

export interface ResolveArgs {
  pieces: Piece[];
  attackerId: PieceId;
  defenderId: PieceId;
  tile: Coord;
}

export interface ResolveOutcome {
  pieces: Piece[];
  result: CombatResult;
}

function decide(attacker: Piece, defender: Piece): CombatOutcome {
  if (attacker.rank > defender.rank) return "ATTACKER_WINS";
  if (attacker.rank < defender.rank) return "DEFENDER_WINS";
  return "MUTUAL_DESTRUCTION";
}

/** Returns a new pieces array with the given ids revealed. */
function reveal(pieces: Piece[], ids: ReadonlyArray<PieceId>): Piece[] {
  const set = new Set(ids);
  return pieces.map((p) => (set.has(p.id) ? { ...p, isRevealed: true } : p));
}

export const CombatEngine = {
  /**
   * Detect whether a move into (row, column) collides with a live
   * enemy piece. Friendly-occupied tiles return null (movement layer
   * should treat them as illegal instead of triggering combat).
   */
  detectCollision(
    pieces: Piece[],
    attackerId: PieceId,
    target: Coord,
  ): Piece | null {
    const attacker = PieceManager.findById(pieces, attackerId);
    if (!attacker) return null;
    const occupant = PieceManager.findAt(pieces, target.row, target.column);
    if (!occupant) return null;
    if (occupant.owner === attacker.owner) return null;
    return occupant;
  },

  /**
   * Pure combat resolution. Given the attacker/defender pair and the
   * target tile, returns a new pieces array reflecting the outcome
   * plus a CombatResult record. Throws on unknown ids so callers
   * cannot silently corrupt state.
   */
  resolve({ pieces, attackerId, defenderId, tile }: ResolveArgs): ResolveOutcome {
    const attacker = PieceManager.findById(pieces, attackerId);
    const defender = PieceManager.findById(pieces, defenderId);
    if (!attacker) throw new Error(`CombatEngine: unknown attacker ${attackerId}`);
    if (!defender) throw new Error(`CombatEngine: unknown defender ${defenderId}`);

    const outcome = decide(attacker, defender);

    // 1) Reveal both combatants first — reveal is permanent even on death.
    let next = reveal(pieces, [attackerId, defenderId]);

    // 2) Apply outcome to positions + liveness.
    const removedIds: PieceId[] = [];
    let survivorId: PieceId | null = null;

    if (outcome === "ATTACKER_WINS") {
      next = PieceManager.kill(next, defenderId);
      next = PieceManager.remove(next, defenderId);
      next = PieceManager.move(next, attackerId, tile.row, tile.column);
      removedIds.push(defenderId);
      survivorId = attackerId;
    } else if (outcome === "DEFENDER_WINS") {
      next = PieceManager.kill(next, attackerId);
      next = PieceManager.remove(next, attackerId);
      // Defender holds its ground — no position change.
      removedIds.push(attackerId);
      survivorId = defenderId;
    } else {
      next = PieceManager.remove(next, attackerId);
      next = PieceManager.remove(next, defenderId);
      removedIds.push(attackerId, defenderId);
      survivorId = null;
    }

    // Snapshots capture the revealed state at combat time so UI can
    // render the true identities regardless of subsequent removal.
    const attackerSnapshot: Piece = { ...attacker, isRevealed: true };
    const defenderSnapshot: Piece = { ...defender, isRevealed: true };

    const result: CombatResult = {
      id: nextCombatId(),
      outcome,
      tile,
      attackerId,
      defenderId,
      attackerSnapshot,
      defenderSnapshot,
      removedIds,
      survivorId,
    };

    return { pieces: next, result };
  },
};

export type CombatEngineType = typeof CombatEngine;
