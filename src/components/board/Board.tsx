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

            <BoardFrame
                rows={rows}
                cols={cols}
            />

            {/* ============================
          PLAY AREA
      ============================ */}

            <div
                className="absolute"
                style={{
                    top: BOARD_CONFIG.playArea.top,
                    right: BOARD_CONFIG.playArea.right,
                    bottom: BOARD_CONFIG.playArea.bottom,
                    left: BOARD_CONFIG.playArea.left,
                }}
            >
                {/* Terreno */}

                <BoardTerrain
                    rows={rows}
                    cols={cols}
                />

                {/* Grade */}

                <BoardGrid
                    rows={rows}
                    cols={cols}
                />

                {/* Coordenadas */}

                <BoardCoordinates
                    rows={rows}
                    cols={cols}
                />

                {/* Peças */}

                <BoardPieces
                    rows={rows}
                    cols={cols}
                />

                {/* Efeitos */}

                <BoardEffects
                    rows={rows}
                    cols={cols}
                />

                {/* Fog */}

                <BoardFog
                    rows={rows}
                    cols={cols}
                />
            </div>
        </div>
    );
}