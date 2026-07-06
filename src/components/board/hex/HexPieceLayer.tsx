import { hexToPixel } from "@/services/hexGeometry";
import { Piece } from "@/components/Piece";
import { FogOfWarEngine, LOCAL_VIEWER } from "@/services/fogOfWarEngine";
import type { Piece as PieceModel } from "@/types/piece";
import type { CombatResult } from "@/types/combat";

export interface HexPieceLayerProps {
  pieces: PieceModel[];
  size: number;
  selectedPieceId?: string | null;
  onPieceClick?: (piece: PieceModel) => void;
  /** Deployment screen shows only the player's own pieces — no fog needed. */
  respectFogOfWar?: boolean;
  lastCombat?: CombatResult | null;
  combatActive?: boolean;
  justRevealed?: Set<string>;
}

/**
 * "Peças" layer — positions the existing `Piece` component (unchanged)
 * at the pixel center of its `(currentRow, currentColumn)` hex. Reuses
 * the same reveal/reaction visuals the square board already had.
 */
export function HexPieceLayer({
  pieces,
  size,
  selectedPieceId = null,
  onPieceClick,
  respectFogOfWar = true,
  lastCombat = null,
  combatActive = false,
  justRevealed,
}: HexPieceLayerProps) {
  return (
    <>
      {pieces
        .filter((p) => p.isAlive)
        .map((piece) => {
          const { x, y } = hexToPixel(piece.currentRow, piece.currentColumn, size);
          const hidden = respectFogOfWar && FogOfWarEngine.isHiddenFrom(piece, LOCAL_VIEWER);

          const isCombatTile =
            combatActive &&
            !!lastCombat &&
            piece.currentRow === lastCombat.tile.row &&
            piece.currentColumn === lastCombat.tile.column;
          const isWinner = combatActive && lastCombat?.survivorId === piece.id;
          const isRevealPulse = justRevealed?.has(piece.id) ?? false;

          const fxClass = [
            isCombatTile ? "combat-shake" : "",
            isWinner ? "combat-winner-glow" : "",
            isRevealPulse ? "piece-reveal-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <foreignObject
              key={piece.id}
              x={x - size}
              y={y - size}
              width={size * 2}
              height={size * 2}
              style={{ overflow: "visible" }}
            >
              <div className={`flex h-full w-full items-center justify-center ${fxClass}`}>
                <Piece
                  piece={piece}
                  selected={piece.id === selectedPieceId}
                  hidden={hidden}
                  onClick={onPieceClick}
                />
              </div>
            </foreignObject>
          );
        })}
    </>
  );
}
