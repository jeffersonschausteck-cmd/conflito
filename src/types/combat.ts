// Combat domain model. Serializable so combat results can be logged,
// replayed, or transmitted over the wire in future netcode.

import type { Piece, PieceId } from "@/types/piece";
import type { Coord } from "@/types/movement";

export type CombatOutcome =
  | "ATTACKER_WINS"
  | "DEFENDER_WINS"
  | "MUTUAL_DESTRUCTION";

export interface CombatResult {
  /** Monotonic id — bump on every resolve so UI can key animations. */
  id: number;
  outcome: CombatOutcome;
  tile: Coord;
  attackerId: PieceId;
  defenderId: PieceId;
  /** Snapshot of the attacker at combat time (post-reveal). */
  attackerSnapshot: Piece;
  /** Snapshot of the defender at combat time (post-reveal). */
  defenderSnapshot: Piece;
  /** Ids of pieces removed as a result of combat. */
  removedIds: PieceId[];
  /** Id of the surviving piece, if any. */
  survivorId: PieceId | null;
}
