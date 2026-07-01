import { InitialSetup } from "@/services/initialSetup";
import type { Piece } from "@/types/piece";

/**
 * DeploymentManager handles the pre-battle deployment phase.
 * It manages piece positioning validation, AI deployment generation,
 * and board layout verification before the match begins.
 */
export const DeploymentManager = {
  /**
   * Generates the default player (Blue) pieces placed on the bottom rows (6-9).
   */
  createDefaultPlayerDeployment(rows: number = 10, cols: number = 10): Piece[] {
    const all = InitialSetup.generate({ rows, cols });
    return all.filter((p) => p.owner === "blue");
  },

  /**
   * Generates a randomized AI (Red) deployment in the top rows (0-3).
   * Shuffles all Red pieces into random slots in rows 0-3.
   */
  generateAIDeployment(rows: number = 10, cols: number = 10): Piece[] {
    const all = InitialSetup.generate({ rows, cols });
    const redPieces = all.filter((p) => p.owner === "red");

    // Red's deployment zone is rows 0 to 3
    const coordinates: { row: number; col: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        coordinates.push({ row: r, col: c });
      }
    }

    // Fisher-Yates shuffle coordinates
    for (let i = coordinates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = coordinates[i];
      coordinates[i] = coordinates[j];
      coordinates[j] = temp;
    }

    // Map Red pieces to shuffled coordinates
    return redPieces.map((piece, idx) => {
      const coord = coordinates[idx];
      return {
        ...piece,
        currentRow: coord.row,
        currentColumn: coord.col,
      };
    });
  },

  /**
   * Validates if the player's pieces are fully and legally placed.
   * Player must have exactly 40 pieces, all on rows 6-9, with no overlaps.
   */
  validateDeployment(pieces: Piece[], rows: number = 10, cols: number = 10): boolean {
    const bluePieces = pieces.filter((p) => p.owner === "blue");
    if (bluePieces.length !== 40) return false;

    // Check if every piece has a valid row (6-9) and column (0-9)
    const placed = bluePieces.filter(
      (p) =>
        p.currentRow >= 6 &&
        p.currentRow < rows &&
        p.currentColumn >= 0 &&
        p.currentColumn < cols
    );
    if (placed.length !== 40) return false;

    // Check for duplicate coordinates
    const coordinatesSet = new Set<string>();
    for (const p of placed) {
      const key = `${p.currentRow}-${p.currentColumn}`;
      if (coordinatesSet.has(key)) {
        return false; // overlapping coordinates
      }
      coordinatesSet.add(key);
    }

    return true;
  },
};
