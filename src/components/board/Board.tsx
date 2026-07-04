import { BOARD_CONFIG } from "./constants";

import { BoardFrame } from "./BoardFrame";
import { BoardTerrain } from "./BoardTerrain";
import { BoardGrid } from "./BoardGrid";
import { BoardCoordinates } from "./BoardCoordinates";
import { BoardPieces } from "./BoardPieces";
import { BoardEffects } from "./BoardEffects";
import { BoardFog } from "./BoardFog";

export interface BoardProps {
    rows?: number;
    cols?: number;
}

export function Board({
    rows = BOARD_CONFIG.rows,
    cols = BOARD_CONFIG.cols,
}: BoardProps) {
    return (
        <div
            className="
        relative
        mx-auto
        aspect-square
        w-full
        max-w-[920px]
      "
        >
            {/* ============================
          MOLDURA
      ============================ */}

            <BoardFrame />

            {/* Coordenadas */}

            <BoardCoordinates
                rows={rows}
                cols={cols}
            />

            {/* Play Area */}

            <div
                className="absolute inset-0"
                style={{
                    top: BOARD_CONFIG.playArea.top,
                    right: BOARD_CONFIG.playArea.right,
                    bottom: BOARD_CONFIG.playArea.bottom,
                    left: BOARD_CONFIG.playArea.left,
                    overflow: "hidden",
                }}
            >

                <BoardTerrain />

                <BoardGrid />

                <BoardPieces />

                <BoardEffects />

                <BoardFog />

            </div>
        </div>
    );
}