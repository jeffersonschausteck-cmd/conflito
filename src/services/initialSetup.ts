import { PIECES } from "@/config/pieces";
import { PieceManager } from "@/services/pieceManager";
import type { Piece, PieceType, PlayerOwner } from "@/types/piece";

/**
 * Deployment template — 4 columns deep x 10 rows per side. Only the
 * piece TYPE is declared here; rank and mobility are derived from
 * `PIECES` (the single official source of truth — Documento 06) so
 * this grid can never drift out of sync with the rest of the app.
 *
 * Counts match Documento 06 exactly: 1 Comandante, 2 Oficiais,
 * 3 Franco-atiradores, 12 Infantarias, 8 Engenheiros, 6 Exploradores,
 * 1 Espião, 6 Bombas, 1 Bandeira = 40 peças.
 *
 * Sprint 2.5: teams now face each other left/right instead of
 * top/bottom, so the outer index is DEPTH (columns from the player's
 * home edge, 0 = back rank) and the inner index is POSITION along the
 * shared vertical edge (row). The array content is unchanged from
 * Sprint 2 — only how it's read changed.
 */
const DEPLOYMENT: PieceType[][] = [
  // Back rank (depth 0) — command + objective
  ["bomb", "officer", "bomb", "commander", "flag", "bomb", "officer", "bomb", "bomb", "bomb"],
  // Mid-back (depth 1) — specialists
  ["engineer", "engineer", "engineer", "spy", "engineer", "engineer", "sniper", "engineer", "engineer", "engineer"],
  // Mid-front (depth 2) — infantry line
  ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry"],
  // Front rank (depth 3) — scouts + remaining snipers/infantry
  ["scout", "scout", "sniper", "infantry", "scout", "scout", "infantry", "sniper", "scout", "scout"],
];

export interface InitialSetupOptions {
  rows?: number;
  cols?: number;
}

/**
 * Generates every piece for both players. Performs NO legality checks
 * — that's the rules service's job. Azul deploys on the left edge,
 * Vermelho mirrors on the right edge (Sprint 2.5 orientation).
 */
export const InitialSetup = {
  generate({ rows = 10, cols = 10 }: InitialSetupOptions = {}): Piece[] {
    const pieces: Piece[] = [];
    const counters = new Map<string, number>();
    const nextIndex = (owner: PlayerOwner, type: PieceType) => {
      const key = `${owner}:${type}`;
      const i = (counters.get(key) ?? 0) + 1;
      counters.set(key, i);
      return i;
    };

    for (let depth = 0; depth < DEPLOYMENT.length; depth++) {
      for (let pos = 0; pos < Math.min(rows, DEPLOYMENT[depth].length); pos++) {
        const type = DEPLOYMENT[depth][pos];
        const info = PIECES[type];
        const rank = info?.patente ?? 0;
        const canMove = info?.podeMover ?? true;

        // Blue — left edge, columns [0 .. 3].
        pieces.push(
          PieceManager.create({
            owner: "blue",
            pieceType: type,
            rank,
            row: pos,
            column: depth,
            index: nextIndex("blue", type),
            canMove,
            isRevealed: false, // fog of war — owner visibility resolved by FogOfWarEngine
          }),
        );

        // Red — right edge, mirrored across the vertical center line.
        pieces.push(
          PieceManager.create({
            owner: "red",
            pieceType: type,
            rank,
            row: pos,
            column: cols - 1 - depth,
            index: nextIndex("red", type),
            canMove,
            isRevealed: false,
          }),
        );
      }
    }

    return pieces;
  },
};
