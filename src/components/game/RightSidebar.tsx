import { CommandCenter } from "./CommandCenter";
import { BattleStatus } from "./BattleStatus";
import { RevealLogPanel } from "./RevealLogPanel";

export function RightSidebar() {
    return (

        <aside
            className="
        grid
        h-full
        grid-cols-[280px_320px_220px]
        gap-4
    "
        >

            {/* CENTRO DE COMANDO */}

            <div className="h-full">
                <CommandCenter />
            </div>

            {/* REGISTRO DE INTELIGÊNCIA */}

            <div className="h-full">
                <RevealLogPanel />
            </div>

            {/* ESTADO DA BATALHA */}

            <div className="h-full">
                <BattleStatus />
            </div>

        </aside>

    );
}