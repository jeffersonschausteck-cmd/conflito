import { PieceManager } from "@/services/pieceManager";
import type { Piece, PieceType, PlayerOwner } from "@/types/piece";

/**
 * Temporary deployment template. Each row is 10 columns wide and maps
 * column index -> piece archetype. Ranks are placeholders; rules will
 * own the canonical values later.
 *
 * Row 0 = back rank (closest to the player's home edge).
 * Row 3 = front rank (closest to the midfield).
 */
const DEPLOYMENT: Array<{ type: PieceType; rank: number; canMove?: boolean }[]> = [
  // Back rank — command + objective
  [
    { type: "flag", rank: 0, canMove: false },
    { type: "bomb", rank: 0, canMove: false },
    { type: "officer", rank: 8 },
    { type: "commander", rank: 10 },
    { type: "officer", rank: 8 },
    { type: "officer", rank: 8 },
    { type: "spy", rank: 1 },
    { type: "bomb", rank: 0, canMove: false },
    { type: "sniper", rank: 7 },
    { type: "flag", rank: 0, canMove: false },
  ],
  // Mid-back — specialists
  [
    { type: "sniper", rank: 7 },
    { type: "engineer", rank: 5 },
    { type: "engineer", rank: 5 },
    { type: "officer", rank: 8 },
    { type: "spy", rank: 1 },
    { type: "engineer", rank: 5 },
    { type: "engineer", rank: 5 },
    { type: "sniper", rank: 7 },
    { type: "officer", rank: 8 },
    { type: "sniper", rank: 7 },
  ],
  // Mid-front — infantry line
  [
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
    { type: "infantry", rank: 4 },
  ],
  // Front rank — scouts
  [
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
    { type: "scout", rank: 2 },
  ],
];

export interface InitialSetupOptions {
  rows?: number;
  cols?: number;
}

/**
 * Generates every piece for both players. Performs NO legality checks
 * — that's the rules service's job. Blue deploys at the bottom, red
 * mirrors at the top.
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

    for (let r = 0; r < DEPLOYMENT.length; r++) {
      for (let c = 0; c < Math.min(cols, DEPLOYMENT[r].length); c++) {
        const spec = DEPLOYMENT[r][c];

        // Blue — bottom of the board, rows [rows-4 .. rows-1].
        const blueRow = rows - 1 - r;
        pieces.push(
          PieceManager.create({
            owner: "blue",
            pieceType: spec.type,
            rank: spec.rank,
            row: blueRow,
            column: c,
            index: nextIndex("blue", spec.type),
            canMove: spec.canMove ?? true,
            isRevealed: false, // fog of war — owner visibility resolved by FogOfWarEngine
          }),
        );

        // Red — top of the board, mirrored.
        pieces.push(
          PieceManager.create({
            owner: "red",
            pieceType: spec.type,
            rank: spec.rank,
            row: r,
            column: cols - 1 - c,
            index: nextIndex("red", spec.type),
            canMove: spec.canMove ?? true,
            isRevealed: false,
          }),
        );
      }
    }

    return pieces;
  },
};
