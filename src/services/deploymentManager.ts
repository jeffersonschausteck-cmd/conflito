import { InitialSetup } from "@/services/initialSetup";
import type { Piece, PlayerOwner } from "@/types/piece";

/**
 * How many columns deep each team's deployment zone is (Sprint 2.5:
 * Azul à esquerda / Vermelho à direita). Matches the depth of the
 * `DEPLOYMENT` template in `initialSetup.ts`.
 */
export const DEPLOYMENT_DEPTH = 4;

const NO_BLOCKED_TILES: ReadonlySet<string> = new Set();

/**
 * DeploymentManager handles the pre-battle deployment phase.
 * It manages piece positioning validation, AI deployment generation,
 * and board layout verification before the match begins.
 */
export const DeploymentManager = {
  /**
   * Generates the default deployment for a side (Azul by default).
   * Sprint MP-02: also used online for whichever side the local
   * player was assigned (blue or red), so both can start from the
   * same standard formation before rearranging.
   */
  createDefaultPlayerDeployment(rows: number = 10, cols: number = 10, owner: PlayerOwner = "blue"): Piece[] {
    const all = InitialSetup.generate({ rows, cols });
    return all.filter((p) => p.owner === owner);
  },

  /**
   * Generates a randomized AI (Red) deployment in the right columns
   * (cols - DEPLOYMENT_DEPTH .. cols - 1). Shuffles all Red pieces into
   * random slots within that zone, skipping any blocked (terrain
   * obstacle) coordinate.
   */
  generateAIDeployment(
    rows: number = 10,
    cols: number = 10,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
  ): Piece[] {
    const all = InitialSetup.generate({ rows, cols });
    const redPieces = all.filter((p) => p.owner === "red");

    // Red's deployment zone is the rightmost DEPLOYMENT_DEPTH columns.
    const zoneStart = Math.max(0, cols - DEPLOYMENT_DEPTH);
    const coordinates: { row: number; col: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = zoneStart; c < cols; c++) {
        if (blockedTiles.has(`${r}-${c}`)) continue;
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
   * Validates if a side's pieces are fully and legally placed.
   * That side must have exactly 40 pieces, all within its own
   * DEPLOYMENT_DEPTH columns (left for Azul, right for Vermelho —
   * Sprint 2.5 orientation), none on a blocked (terrain obstacle)
   * coordinate, with no overlaps.
   *
   * Defaults to `owner: "blue"` to preserve the original single-player
   * call sites; Sprint MP-02 passes `owner` explicitly to also
   * validate Vermelho's confirmed online deployment, reusing this same
   * function instead of duplicating the logic.
   */
  validateDeployment(
    pieces: Piece[],
    rows: number = 10,
    cols: number = 10,
    blockedTiles: ReadonlySet<string> = NO_BLOCKED_TILES,
    owner: PlayerOwner = "blue",
  ): boolean {
    const sidePieces = pieces.filter((p) => p.owner === owner);
    if (sidePieces.length !== 40) return false;

    const zoneStart = owner === "blue" ? 0 : Math.max(0, cols - DEPLOYMENT_DEPTH);
    const zoneEnd = owner === "blue" ? DEPLOYMENT_DEPTH : cols;

    // Check if every piece has a valid row and column within its own zone.
    const placed = sidePieces.filter(
      (p) =>
        p.currentRow >= 0 &&
        p.currentRow < rows &&
        p.currentColumn >= zoneStart &&
        p.currentColumn < zoneEnd &&
        !blockedTiles.has(`${p.currentRow}-${p.currentColumn}`)
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
