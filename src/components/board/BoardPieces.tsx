import { FogOfWarEngine, LOCAL_VIEWER } from "@/services/fogOfWarEngine";
import { Piece } from "@/components/Piece";

import type { Piece as PieceModel } from "@/types/piece";

export interface BoardPiecesProps {
    rows?: number;
    cols?: number;

    pieces: PieceModel[];

    selectedPieceId: string | null;

    justRevealed: Set<string>;

    lastCombat: any;

    combatTick: number | null;

    onPieceClick(piece: PieceModel): void;
}

export function BoardPieces({

    rows = 10,
    cols = 10,

    pieces,

    selectedPieceId,

    justRevealed,

    lastCombat,

    combatTick,

    onPieceClick,


}: BoardPiecesProps) {
    void pieces;
    void selectedPieceId;
    void justRevealed;
    void lastCombat;
    void combatTick;
    void onPieceClick;
    return (
        <div
            className="h-full w-full pointer-events-none"
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
        >
            {/* As peças serão migradas para cá na próxima fase. */}
        </div>
    );
}

